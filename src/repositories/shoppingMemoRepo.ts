import { getDB } from '../db/db';
import type { ShoppingMemoItem } from '../types';
import { generateId } from '../utils/id';
import { nowIsoStr } from '../utils/date';
import { AppError } from '../utils/errors';

export async function listShoppingMemo(): Promise<ShoppingMemoItem[]> {
  try {
    const db = await getDB();
    const all = await db.getAll('shoppingMemo');
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    throw new AppError('買い物メモの読み込みに失敗しました');
  }
}

export async function addShoppingMemoItem(
  input: Omit<ShoppingMemoItem, 'id' | 'createdAt' | 'checked'>
): Promise<ShoppingMemoItem> {
  if (!input.name.trim()) {
    throw new AppError('食材名を入力してください');
  }
  try {
    const db = await getDB();
    const item: ShoppingMemoItem = {
      ...input,
      id: generateId(),
      checked: false,
      createdAt: nowIsoStr(),
    };
    await db.put('shoppingMemo', item);
    return item;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('買い物メモの保存に失敗しました');
  }
}

export async function toggleShoppingMemoChecked(id: string, checked: boolean): Promise<void> {
  try {
    const db = await getDB();
    const item = await db.get('shoppingMemo', id);
    if (!item) return;
    await db.put('shoppingMemo', { ...item, checked });
  } catch {
    throw new AppError('買い物メモの更新に失敗しました');
  }
}

export async function deleteShoppingMemoItem(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('shoppingMemo', id);
  } catch {
    throw new AppError('買い物メモの削除に失敗しました');
  }
}

export async function deleteShoppingMemoItems(ids: string[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('shoppingMemo', 'readwrite');
    await Promise.all(ids.map((id) => tx.store.delete(id)));
    await tx.done;
  } catch {
    throw new AppError('買い物メモの削除に失敗しました');
  }
}
