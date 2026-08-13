import { getDB } from '../db/db';
import type { Ingredient } from '../types';
import { generateId } from '../utils/id';
import { nowIsoStr } from '../utils/date';
import { AppError } from '../utils/errors';
import { snapQuantity } from '../utils/quantity';
import { consumeExpiryBatches } from '../utils/expiry';

// 単位の前後の空白を除去して比較・保存する（古いデータや購入時の入力に紛れ込んだ空白で
// 同じ食材なのに別の食材として扱われ、期限などが分かれてしまうのを防ぐ）
function normalizeUnit(unit: string | undefined): string {
  return (unit ?? '').trim() || '個';
}

function normalize(ingredient: Ingredient): Ingredient {
  if (typeof ingredient.quantity === 'number' && ingredient.unit) {
    const trimmed = normalizeUnit(ingredient.unit);
    return trimmed === ingredient.unit ? ingredient : { ...ingredient, unit: trimmed };
  }
  return { ...ingredient, quantity: ingredient.quantity ?? ingredient.count ?? 0, unit: normalizeUnit(ingredient.unit) };
}

export async function listIngredients(): Promise<Ingredient[]> {
  try {
    const db = await getDB();
    const all = await db.getAll('ingredients');
    return all.map(normalize).sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  } catch {
    throw new AppError('食材の読み込みに失敗しました');
  }
}

export async function getIngredient(id: string): Promise<Ingredient | undefined> {
  try {
    const db = await getDB();
    const ing = await db.get('ingredients', id);
    return ing ? normalize(ing) : undefined;
  } catch {
    throw new AppError('食材の読み込みに失敗しました');
  }
}

export async function addIngredient(
  input: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Ingredient> {
  if (!input.name.trim()) {
    throw new AppError('食材名を入力してください');
  }
  try {
    const db = await getDB();
    const now = nowIsoStr();
    const ingredient: Ingredient = {
      ...input,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    await db.put('ingredients', ingredient);
    return ingredient;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('食材の保存に失敗しました');
  }
}

export async function updateIngredient(ingredient: Ingredient): Promise<Ingredient> {
  try {
    const db = await getDB();
    const updated = { ...ingredient, updatedAt: nowIsoStr() };
    await db.put('ingredients', updated);
    return updated;
  } catch {
    throw new AppError('食材の更新に失敗しました');
  }
}

// 同名・同単位の食材を検索する（購入編集時の差分反映の安全確認に使用）
export async function findIngredientByNameUnit(name: string, unit: string): Promise<Ingredient | undefined> {
  const all = await listIngredients();
  const targetUnit = normalizeUnit(unit);
  return all.find((i) => i.name.trim() === name.trim() && i.unit === targetUnit);
}

export async function deleteIngredient(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('ingredients', id);
  } catch {
    throw new AppError('食材の削除に失敗しました');
  }
}

// 購入時の在庫反映：同名・同単位の食材があれば数量を加算、なければ新規作成する
// expiryDateを指定した場合、代表期限は最新の値へ上書きしつつ、古い期限もexpiryBatchesへ保持する
export async function addOrMergeIngredient(
  name: string,
  unit: string,
  quantity: number,
  category: Ingredient['category'] = 'その他',
  expiryDate?: string,
  itemType: Ingredient['itemType'] = '食品'
): Promise<Ingredient> {
  try {
    const db = await getDB();
    const targetUnit = normalizeUnit(unit);
    const all = (await db.getAll('ingredients')).map(normalize);
    const existing = all.find((i) => i.name.trim() === name.trim() && i.unit === targetUnit);
    if (existing) {
      const nextQuantity = snapQuantity(existing.quantity + quantity);
      let expiryBatches = existing.expiryBatches;
      let nextExpiryDate = existing.expiryDate;
      if (expiryDate) {
        const previousBatches =
          existing.expiryBatches ??
          (existing.expiryDate ? [{ date: existing.expiryDate, quantity: existing.quantity }] : []);
        expiryBatches = [...previousBatches, { date: expiryDate, quantity }];
        nextExpiryDate = expiryDate;
      }
      const updated: Ingredient = {
        ...existing,
        quantity: nextQuantity,
        expiryDate: nextExpiryDate,
        expiryBatches,
        updatedAt: nowIsoStr(),
      };
      await db.put('ingredients', updated);
      return updated;
    }
    const now = nowIsoStr();
    const created: Ingredient = {
      id: generateId(),
      name: name.trim(),
      category,
      unit: targetUnit,
      quantity,
      expiryDate,
      expiryBatches: expiryDate ? [{ date: expiryDate, quantity }] : undefined,
      itemType,
      createdAt: now,
      updatedAt: now,
    };
    await db.put('ingredients', created);
    return created;
  } catch {
    throw new AppError('食材在庫への反映に失敗しました');
  }
}

// 数量が0になった食材は期限情報も一緒にクリアする（カレンダー等の期限表示から除外するため）
export function clearExpiryIfEmpty(ingredient: Ingredient): Ingredient {
  if (ingredient.quantity > 0) return ingredient;
  return { ...ingredient, expiryDate: undefined, expiryBatches: undefined };
}

// 調理・食事で使用した分だけ在庫を減らす（0未満にはしない）
export async function decrementIngredientQuantity(id: string, amount: number): Promise<Ingredient | undefined> {
  try {
    const db = await getDB();
    const ing = await db.get('ingredients', id);
    if (!ing) return undefined;
    const current = normalize(ing);
    const nextQuantity = snapQuantity(current.quantity - amount);
    const { expiryDate, expiryBatches } = consumeExpiryBatches(current, amount);
    const updated: Ingredient = clearExpiryIfEmpty({
      ...current,
      quantity: nextQuantity,
      expiryDate,
      expiryBatches,
      updatedAt: nowIsoStr(),
    });
    await db.put('ingredients', updated);
    return updated;
  } catch {
    throw new AppError('食材在庫の更新に失敗しました');
  }
}

// 記録編集による差分返却など、期限情報は変更せず数量だけ増やす。対象食材が削除済みの場合は何もしない
export async function incrementIngredientQuantity(id: string, amount: number): Promise<Ingredient | undefined> {
  try {
    const db = await getDB();
    const ing = await db.get('ingredients', id);
    if (!ing) return undefined;
    const current = normalize(ing);
    const nextQuantity = snapQuantity(current.quantity + amount);
    const updated: Ingredient = { ...current, quantity: nextQuantity, updatedAt: nowIsoStr() };
    await db.put('ingredients', updated);
    return updated;
  } catch {
    throw new AppError('食材在庫の更新に失敗しました');
  }
}
