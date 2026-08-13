import { getDB } from '../db/db';
import type { Settings } from '../types';
import { AppError } from '../utils/errors';

const DEFAULT_SETTINGS: Settings = { id: 'settings', monthlyBudget: 15000, budgetStartDay: 1, mealTrackingEnabled: true };

function normalize(settings: Settings | undefined, mealTrackingDefault: boolean): Settings {
  if (!settings) return { ...DEFAULT_SETTINGS, mealTrackingEnabled: mealTrackingDefault };
  return {
    ...settings,
    budgetStartDay: settings.budgetStartDay ?? 1,
    mealTrackingEnabled: settings.mealTrackingEnabled ?? true,
  };
}

export async function getSettings(): Promise<Settings> {
  try {
    const db = await getDB();
    const settings = await db.get('settings', 'settings');
    if (settings) return normalize(settings, true);
    // 設定レコードが一度も保存されていない場合のみ「新規ユーザー」とみなす。
    // 食材・購入・食事の記録が既にあるユーザー（設定画面を開いたことがないだけ）は
    // 従来通り食事記録ONのまま扱い、実運用中の挙動を変えない
    const [ingredientCount, purchaseCount, mealCount] = await Promise.all([
      db.count('ingredients'),
      db.count('purchases'),
      db.count('meals'),
    ]);
    const isBrandNew = ingredientCount === 0 && purchaseCount === 0 && mealCount === 0;
    return normalize(undefined, !isBrandNew);
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
    const current = normalize(await db.get('settings', 'settings'), true);
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
    const current = normalize(await db.get('settings', 'settings'), true);
    const settings: Settings = { ...current, budgetStartDay };
    await db.put('settings', settings);
    return settings;
  } catch {
    throw new AppError('設定の保存に失敗しました');
  }
}

export async function updateMealTrackingEnabled(enabled: boolean): Promise<Settings> {
  try {
    const db = await getDB();
    const current = normalize(await db.get('settings', 'settings'), true);
    const settings: Settings = { ...current, mealTrackingEnabled: enabled };
    await db.put('settings', settings);
    return settings;
  } catch {
    throw new AppError('設定の保存に失敗しました');
  }
}
