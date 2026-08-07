import { getDB } from '../db/db';
import type { Ingredient } from '../types';
import { generateId } from '../utils/id';
import { nowIsoStr } from '../utils/date';
import { AppError } from '../utils/errors';

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

export async function deleteIngredient(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('ingredients', id);
  } catch {
    throw new AppError('食材の削除に失敗しました');
  }
}

// 調理・食事で使用した分だけ在庫を減らす（0未満にはしない）
export async function decrementIngredientQuantity(id: string, amount: number): Promise<Ingredient | undefined> {
  try {
    const db = await getDB();
    const ing = await db.get('ingredients', id);
    if (!ing) return undefined;
    const current = normalize(ing);
    const nextQuantity = Math.max(0, Math.round((current.quantity - amount) * 10000) / 10000);
    const updated: Ingredient = { ...current, quantity: nextQuantity, updatedAt: nowIsoStr() };
    await db.put('ingredients', updated);
    return updated;
  } catch {
    throw new AppError('食材在庫の更新に失敗しました');
  }
}
