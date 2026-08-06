import { getDB } from '../db/db';
import type { Settings } from '../types';
import { AppError } from '../utils/errors';

const DEFAULT_SETTINGS: Settings = { id: 'settings', monthlyBudget: 15000 };

export async function getSettings(): Promise<Settings> {
  try {
    const db = await getDB();
    const settings = await db.get('settings', 'settings');
    return settings ?? DEFAULT_SETTINGS;
  } catch {
    throw new AppError('設定の読み込みに失敗しました');
  }
}

export async function updateMonthlyBudget(monthlyBudget: number): Promise<Settings> {
  if (!Number.isFinite(monthlyBudget) || monthlyBudget < 0) {
    throw new AppError('予算には0以上の数値を入力してください');
  }
  try {
    const db = await getDB();
    const settings: Settings = { id: 'settings', monthlyBudget };
    await db.put('settings', settings);
    return settings;
  } catch {
    throw new AppError('設定の保存に失敗しました');
  }
}
