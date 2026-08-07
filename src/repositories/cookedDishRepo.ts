import { getDB } from '../db/db';
import type { CookedDish } from '../types';
import { generateId } from '../utils/id';
import { nowIsoStr, todayDateStr, nowTimeStr } from '../utils/date';
import { AppError } from '../utils/errors';

export async function listCookedDishes(): Promise<CookedDish[]> {
  try {
    const db = await getDB();
    const all = await db.getAll('cookedDishes');
    return all.sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
  } catch {
    throw new AppError('調理履歴の読み込みに失敗しました');
  }
}

export async function listCookedDishesByMonth(ym: string): Promise<CookedDish[]> {
  const all = await listCookedDishes();
  return all.filter((d) => d.date.startsWith(ym));
}

// 食事記録の「調理済み料理から選ぶ」候補（食数管理が未設定 or 残り>0のもの）
export async function listAvailableCookedDishes(): Promise<CookedDish[]> {
  const all = await listCookedDishes();
  return all.filter((d) => d.servingsRemaining === undefined || d.servingsRemaining > 0);
}

export async function getCookedDish(id: string): Promise<CookedDish | undefined> {
  try {
    const db = await getDB();
    return await db.get('cookedDishes', id);
  } catch {
    throw new AppError('調理済み料理の読み込みに失敗しました');
  }
}

export async function addCookedDish(
  input: Omit<CookedDish, 'id' | 'createdAt' | 'date' | 'time'> & { date?: string; time?: string }
): Promise<CookedDish> {
  if (!input.name.trim()) {
    throw new AppError('料理名を入力してください');
  }
  try {
    const db = await getDB();
    const dish: CookedDish = {
      ...input,
      id: generateId(),
      date: input.date ?? todayDateStr(),
      time: input.time ?? nowTimeStr(),
      createdAt: nowIsoStr(),
    };
    await db.put('cookedDishes', dish);
    return dish;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('調理記録の保存に失敗しました');
  }
}

// 食事記録で調理済み料理を1食分消費する
export async function consumeCookedDishServing(id: string): Promise<void> {
  try {
    const db = await getDB();
    const dish = await db.get('cookedDishes', id);
    if (!dish || dish.servingsRemaining === undefined) return;
    const next = Math.max(0, dish.servingsRemaining - 1);
    await db.put('cookedDishes', { ...dish, servingsRemaining: next });
  } catch {
    throw new AppError('調理済み料理の更新に失敗しました');
  }
}
