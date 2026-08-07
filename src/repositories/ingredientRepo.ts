import { getDB } from '../db/db';
import type { Ingredient } from '../types';
import { generateId } from '../utils/id';
import { nowIsoStr } from '../utils/date';
import { AppError } from '../utils/errors';
import { snapQuantity } from '../utils/quantity';

function normalize(ingredient: Ingredient): Ingredient {
  if (typeof ingredient.quantity === 'number' && ingredient.unit) return ingredient;
  return { ...ingredient, quantity: ingredient.quantity ?? ingredient.count ?? 0, unit: ingredient.unit ?? '個' };
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
  return all.find((i) => i.name.trim() === name.trim() && i.unit === unit);
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
  expiryDate?: string
): Promise<Ingredient> {
  try {
    const db = await getDB();
    const all = (await db.getAll('ingredients')).map(normalize);
    const existing = all.find((i) => i.name.trim() === name.trim() && i.unit === unit);
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
      unit,
      quantity,
      expiryDate,
      expiryBatches: expiryDate ? [{ date: expiryDate, quantity }] : undefined,
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
    const updated: Ingredient = clearExpiryIfEmpty({
      ...current,
      quantity: nextQuantity,
      updatedAt: nowIsoStr(),
    });
    await db.put('ingredients', updated);
    return updated;
  } catch {
    throw new AppError('食材在庫の更新に失敗しました');
  }
}
