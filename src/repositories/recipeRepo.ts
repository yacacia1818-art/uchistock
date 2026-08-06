import { getDB } from '../db/db';
import type { Recipe } from '../types';
import { generateId } from '../utils/id';
import { nowIsoStr } from '../utils/date';
import { AppError } from '../utils/errors';

export async function listRecipes(): Promise<Recipe[]> {
  try {
    const db = await getDB();
    const all = await db.getAll('recipes');
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    throw new AppError('レシピの読み込みに失敗しました');
  }
}

export async function getRecipe(id: string): Promise<Recipe | undefined> {
  try {
    const db = await getDB();
    return await db.get('recipes', id);
  } catch {
    throw new AppError('レシピの読み込みに失敗しました');
  }
}

export async function addRecipe(
  input: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Recipe> {
  if (!input.name.trim()) {
    throw new AppError('料理名を入力してください');
  }
  if (!input.body.trim()) {
    throw new AppError('レシピ本文を入力してください');
  }
  try {
    const db = await getDB();
    const now = nowIsoStr();
    const recipe: Recipe = { ...input, id: generateId(), createdAt: now, updatedAt: now };
    await db.put('recipes', recipe);
    return recipe;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('レシピの保存に失敗しました');
  }
}

export async function updateRecipe(recipe: Recipe): Promise<Recipe> {
  try {
    const db = await getDB();
    const updated = { ...recipe, updatedAt: nowIsoStr() };
    await db.put('recipes', updated);
    return updated;
  } catch {
    throw new AppError('レシピの更新に失敗しました');
  }
}

export async function deleteRecipe(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('recipes', id);
  } catch {
    throw new AppError('レシピの削除に失敗しました');
  }
}
