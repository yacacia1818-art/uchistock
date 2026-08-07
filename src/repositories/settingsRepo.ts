import { getDB } from '../db/db';
import type { Settings } from '../types';
import { AppError } from '../utils/errors';

const DEFAULT_SETTINGS: Settings = { id: 'settings', monthlyBudget: 15000, budgetStartDay: 1 };

function normalize(settings: Settings | undefined): Settings {
  if (!settings) return DEFAULT_SETTINGS;
  return { ...settings, budgetStartDay: settings.budgetStartDay ?? 1 };
}

export async function getSettings(): Promise<Settings> {
  try {
    const db = await getDB();
    const settings = await db.get('settings', 'settings');
    return normalize(settings);
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
    const current = normalize(await db.get('settings', 'settings'));
    const settings: Settings = { ...current, monthlyBudget };
    await db.put('settings', settings);
    return settings;
  } catch {
    throw new AppError('設定の保存に失敗しました');
  }
}

export async function updateBudgetStartDay(budgetStartDay: number): Promise<Settings> {
  if (!Number.isInteger(budgetStartDay) || budgetStartDay < 1 || budgetStartDay > 28) {
    throw new AppError('集計開始日は1〜28の範囲で指定してください');
  }
  try {
    const db = await getDB();
    const current = normalize(await db.get('settings', 'settings'));
    const settings: Settings = { ...current, budgetStartDay };
    await db.put('settings', settings);
    return settings;
  } catch {
    throw new AppError('設定の保存に失敗しました');
  }
}
