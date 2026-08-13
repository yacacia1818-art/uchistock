import { getDB } from '../db/db';
import type { Memo } from '../types';
import { generateId } from '../utils/id';
import { nowIsoStr } from '../utils/date';
import { AppError } from '../utils/errors';

export async function listMemos(): Promise<Memo[]> {
  try {
    const db = await getDB();
    const all = await db.getAll('memos');
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    throw new AppError('メモの読み込みに失敗しました');
  }
}

export async function addMemo(body: string): Promise<Memo> {
  if (!body.trim()) {
    throw new AppError('メモを入力してください');
  }
  try {
    const db = await getDB();
    const now = nowIsoStr();
    const memo: Memo = { id: generateId(), body: body.trim(), createdAt: now, updatedAt: now };
    await db.put('memos', memo);
    return memo;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('メモの保存に失敗しました');
  }
}

export async function updateMemo(memo: Memo): Promise<Memo> {
  if (!memo.body.trim()) {
    throw new AppError('メモを入力してください');
  }
  try {
    const db = await getDB();
    const updated = { ...memo, body: memo.body.trim(), updatedAt: nowIsoStr() };
    await db.put('memos', updated);
    return updated;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('メモの更新に失敗しました');
  }
}

export async function deleteMemo(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('memos', id);
  } catch {
    throw new AppError('メモの削除に失敗しました');
  }
}
