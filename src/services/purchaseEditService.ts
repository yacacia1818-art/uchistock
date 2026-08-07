import { updatePurchase, saveReceiptImage } from '../repositories/purchaseRepo';
import {
  addOrMergeIngredient,
  decrementIngredientQuantity,
  findIngredientByNameUnit,
  updateIngredient,
} from '../repositories/ingredientRepo';
import { generateId } from '../utils/id';
import { AppError } from '../utils/errors';
import type { InventoryAddition, Purchase, PurchaseItem, ShoppingCategory } from '../types';

export interface EditableItemRow {
  id: string;
  name: string;
  category: ShoppingCategory;
  quantity: string;
  unit: string;
  price: string;
  expiryDate: string;
  addToInventory: boolean;
  convertUnit: boolean;
  invQuantity: string;
  invUnit: string;
}

interface UpdatePurchaseWithInventoryInput {
  purchase: Purchase;
  date: string;
  storeName?: string;
  totalAmount: number;
  foodAmount?: number;
  rows: EditableItemRow[];
  receiptFile?: File | null;
}

export interface UpdatePurchaseResult {
  purchase: Purchase;
  skippedReductions: string[];
  // 数量は変わらず期限だけ変更されたが、対応するバッチを安全に特定できず在庫側の期限を更新できなかった商品名
  skippedExpiryUpdates: string[];
}

// 数量が変わらず期限だけ変更された場合、対応するバッチを安全に特定できるときに限りその期限だけを置き換える。
// 一部消費済みなどでどのバッチが対応するか確定できない場合は、無理に書き換えずスキップする。
async function trySyncExpiryDateOnly(
  name: string,
  unit: string,
  priorExpiryDate: string | undefined,
  priorQuantity: number,
  nextExpiryDate: string | undefined
): Promise<boolean> {
  if (priorExpiryDate === nextExpiryDate) return true;
  const current = await findIngredientByNameUnit(name, unit);
  if (!current) return true;
  const batches = current.expiryBatches ?? (current.expiryDate ? [{ date: current.expiryDate, quantity: current.quantity }] : []);
  const matchIdx = batches.findIndex(
    (b) => b.date === priorExpiryDate && Math.abs(b.quantity - priorQuantity) < 1e-6
  );
  if (matchIdx < 0) return false;
  const nextBatches = [...batches];
  if (nextExpiryDate) {
    nextBatches[matchIdx] = { date: nextExpiryDate, quantity: batches[matchIdx].quantity };
  } else {
    nextBatches.splice(matchIdx, 1);
  }
  const sorted = [...nextBatches].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  await updateIngredient({
    ...current,
    expiryDate: sorted[0]?.date,
    expiryBatches: sorted.length > 0 ? sorted : undefined,
  });
  return true;
}

// 既存の購入記録を安全に更新する：新規追加分のみ加算し、既に反映済みの分は差分のみ反映する。
// 在庫が既に消費されていて差分を安全に引けない場合は、在庫を変更せずスキップする。
export async function updatePurchaseWithInventory(
  input: UpdatePurchaseWithInventoryInput
): Promise<UpdatePurchaseResult> {
  if (!Number.isFinite(input.totalAmount) || input.totalAmount < 0) {
    throw new AppError('金額には0以上の数値を入力してください');
  }

  const { purchase: original } = input;
  const priorByItemId = new Map<string, InventoryAddition>();
  const priorByName = new Map<string, InventoryAddition>();
  for (const a of original.inventoryAdditions ?? []) {
    if (a.itemId) priorByItemId.set(a.itemId, a);
    priorByName.set(a.name, a); // v1.2以前のitemId未付与データ向けフォールバック
  }

  const skippedReductions: string[] = [];
  const skippedExpiryUpdates: string[] = [];
  const newInventoryAdditions: InventoryAddition[] = [];
  const items: PurchaseItem[] = [];

  for (const row of input.rows) {
    if (!row.name.trim()) continue;
    const name = row.name.trim();
    const rowId = row.id || generateId();
    const qtyNum = row.quantity.trim() !== '' ? Number(row.quantity) : undefined;
    const hasQty = qtyNum !== undefined && Number.isFinite(qtyNum) && qtyNum > 0;

    items.push({
      id: rowId,
      name,
      quantity: hasQty ? qtyNum : undefined,
      unit: hasQty ? row.unit : undefined,
      category: row.category,
      price: row.price.trim() !== '' && Number.isFinite(Number(row.price)) ? Number(row.price) : undefined,
      expiryDate: row.category === '食品' && row.expiryDate ? row.expiryDate : undefined,
    });

    if (!row.addToInventory) continue;

    const invQtyRaw = row.convertUnit ? row.invQuantity : row.quantity;
    const invUnit = (row.convertUnit ? row.invUnit : row.unit) || '個';
    const invQtyNum = invQtyRaw.trim() !== '' ? Number(invQtyRaw) : 1;
    const newQty = Number.isFinite(invQtyNum) && invQtyNum > 0 ? invQtyNum : 1;
    const expiryDate = row.category === '食品' ? row.expiryDate || undefined : undefined;

    const prior = priorByItemId.get(rowId) || priorByName.get(name);

    if (!prior) {
      // 新規追加（後から追加した商品、または今回はじめて在庫追加をONにした商品）
      await addOrMergeIngredient(name, invUnit, newQty, 'その他', expiryDate);
      newInventoryAdditions.push({ itemId: rowId, name, unit: invUnit, quantity: newQty, expiryDate });
      continue;
    }

    if (prior.unit !== invUnit) {
      // 単位が変わった場合は差分計算をせず新規追加として扱う（以前反映した分はそのまま残す）
      await addOrMergeIngredient(name, invUnit, newQty, 'その他', expiryDate);
      newInventoryAdditions.push({ itemId: rowId, name, unit: invUnit, quantity: newQty, expiryDate });
      continue;
    }

    const delta = Math.round((newQty - prior.quantity) * 10000) / 10000;
    if (delta > 0) {
      await addOrMergeIngredient(name, invUnit, delta, 'その他', expiryDate);
      newInventoryAdditions.push({ itemId: rowId, name, unit: invUnit, quantity: newQty, expiryDate });
    } else if (delta < 0) {
      const current = await findIngredientByNameUnit(name, invUnit);
      if (current && current.quantity >= Math.abs(delta) - 1e-9) {
        await decrementIngredientQuantity(current.id, Math.abs(delta));
        newInventoryAdditions.push({ itemId: rowId, name, unit: invUnit, quantity: newQty, expiryDate });
      } else {
        // 現在の在庫が少なく安全に減らせないため、在庫はそのままにして記録だけ据え置く
        skippedReductions.push(name);
        newInventoryAdditions.push(prior);
      }
      if (prior.expiryDate !== expiryDate) {
        // 数量減少と期限変更が同時に起きるとどのバッチが対応するか安全に特定できないため、期限側は変更しない
        skippedExpiryUpdates.push(name);
      }
    } else {
      // 数量は変わらない：期限だけが変更されていれば、対応するバッチを安全に特定できる場合に限り置き換える
      const synced = await trySyncExpiryDateOnly(name, invUnit, prior.expiryDate, prior.quantity, expiryDate);
      if (!synced) skippedExpiryUpdates.push(name);
      newInventoryAdditions.push(synced && prior.expiryDate !== expiryDate ? { ...prior, expiryDate } : prior);
    }
  }

  let receiptId = original.receiptId;
  if (input.receiptFile) {
    receiptId = await saveReceiptImage(input.receiptFile);
  }

  const updated: Purchase = {
    ...original,
    date: input.date,
    storeName: input.storeName,
    totalAmount: input.totalAmount,
    foodAmount: input.foodAmount,
    items: items.length > 0 ? items : undefined,
    inventoryAdditions: newInventoryAdditions.length > 0 ? newInventoryAdditions : undefined,
    receiptId,
  };
  await updatePurchase(updated);
  return { purchase: updated, skippedReductions, skippedExpiryUpdates };
}
