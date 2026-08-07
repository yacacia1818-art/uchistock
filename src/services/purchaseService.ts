import { addPurchase, saveReceiptImage } from '../repositories/purchaseRepo';
import { deleteShoppingMemoItems } from '../repositories/shoppingMemoRepo';
import { addOrMergeIngredient } from '../repositories/ingredientRepo';
import type { InventoryAddition, Purchase, PurchaseItem } from '../types';
import { AppError } from '../utils/errors';

interface RecordPurchaseInput {
  totalAmount: number;
  foodAmount?: number;
  storeName?: string;
  items?: PurchaseItem[];
  receiptFile?: File | null;
  carriedMemoIds?: string[];
  inventoryAdditions?: InventoryAddition[];
}

// 買い物メモからの購入確定：購入履歴の作成・買い物メモの消化・在庫への反映を一括で行う。
// inventoryAdditionsは購入記録自体にも保存し、同じ購入記録から二重に在庫加算されないようにする。
export async function recordPurchase(input: RecordPurchaseInput): Promise<Purchase> {
  if (!Number.isFinite(input.totalAmount) || input.totalAmount < 0) {
    throw new AppError('金額には0以上の数値を入力してください');
  }
  if (input.foodAmount !== undefined && (!Number.isFinite(input.foodAmount) || input.foodAmount < 0)) {
    throw new AppError('食費分の金額には0以上の数値を入力してください');
  }

  let receiptId: string | undefined;
  if (input.receiptFile) {
    receiptId = await saveReceiptImage(input.receiptFile);
  }

  const purchase = await addPurchase({
    totalAmount: input.totalAmount,
    foodAmount: input.foodAmount,
    storeName: input.storeName,
    items: input.items,
    receiptId,
    inventoryAdditions: input.inventoryAdditions && input.inventoryAdditions.length > 0 ? input.inventoryAdditions : undefined,
  });

  if (input.carriedMemoIds && input.carriedMemoIds.length > 0) {
    await deleteShoppingMemoItems(input.carriedMemoIds);
  }

  if (input.inventoryAdditions) {
    for (const addition of input.inventoryAdditions) {
      await addOrMergeIngredient(addition.name, addition.unit, addition.quantity, 'その他', addition.expiryDate);
    }
  }

  return purchase;
}
