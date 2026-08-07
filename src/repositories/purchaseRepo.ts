import { getDB } from '../db/db';
import type { Purchase, ReceiptImage } from '../types';
import { generateId } from '../utils/id';
import { nowIsoStr, todayDateStr, nowTimeStr } from '../utils/date';
import { AppError } from '../utils/errors';

export async function listPurchases(): Promise<Purchase[]> {
  try {
    const db = await getDB();
    const all = await db.getAll('purchases');
    return all.sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
  } catch {
    throw new AppError('購入履歴の読み込みに失敗しました');
  }
}

export async function listPurchasesByMonth(ym: string): Promise<Purchase[]> {
  const all = await listPurchases();
  return all.filter((p) => p.date.startsWith(ym));
}

// 開始日・終了日（両端含む）で絞り込む。食費集計期間の計算に使用する
export async function listPurchasesByDateRange(start: string, end: string): Promise<Purchase[]> {
  const all = await listPurchases();
  return all.filter((p) => p.date >= start && p.date <= end);
}

export async function getPurchase(id: string): Promise<Purchase | undefined> {
  try {
    const db = await getDB();
    return await db.get('purchases', id);
  } catch {
    throw new AppError('購入履歴の読み込みに失敗しました');
  }
}

export async function addPurchase(
  input: Omit<Purchase, 'id' | 'createdAt' | 'date' | 'time'> & { date?: string; time?: string }
): Promise<Purchase> {
  if (!Number.isFinite(input.totalAmount) || input.totalAmount < 0) {
    throw new AppError('金額には0以上の数値を入力してください');
  }
  try {
    const db = await getDB();
    const purchase: Purchase = {
      ...input,
      id: generateId(),
      date: input.date ?? todayDateStr(),
      time: input.time ?? nowTimeStr(),
      createdAt: nowIsoStr(),
    };
    await db.put('purchases', purchase);
    return purchase;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('買い物記録の保存に失敗しました');
  }
}

export async function saveReceiptImage(blob: Blob): Promise<string> {
  try {
    const db = await getDB();
    const id = generateId();
    const receipt: ReceiptImage = { id, blob, createdAt: nowIsoStr() };
    await db.put('receipts', receipt);
    return id;
  } catch {
    throw new AppError('レシート画像の保存に失敗しました');
  }
}

export async function getReceiptImage(id: string): Promise<ReceiptImage | undefined> {
  try {
    const db = await getDB();
    return await db.get('receipts', id);
  } catch {
    throw new AppError('レシート画像の読み込みに失敗しました');
  }
}
