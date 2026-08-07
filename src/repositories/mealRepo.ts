import { getDB } from '../db/db';
import type { Meal } from '../types';
import { generateId } from '../utils/id';
import { nowIsoStr, todayDateStr, nowTimeStr } from '../utils/date';
import { AppError } from '../utils/errors';

export async function listMeals(): Promise<Meal[]> {
  try {
    const db = await getDB();
    const all = await db.getAll('meals');
    return all.sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
  } catch {
    throw new AppError('食事記録の読み込みに失敗しました');
  }
}

export async function listMealsByMonth(ym: string): Promise<Meal[]> {
  const all = await listMeals();
  return all.filter((m) => m.date.startsWith(ym));
}

export async function listMealsByDate(date: string): Promise<Meal[]> {
  const all = await listMeals();
  return all.filter((m) => m.date === date);
}

// 同じ日・同じ食事区分に複数回記録した場合もすべてまとめて返す
export async function getTodayMealsGroupedByType(): Promise<Record<string, Meal[]>> {
  const today = todayDateStr();
  const meals = await listMealsByDate(today);
  const result: Record<string, Meal[]> = {};
  for (const meal of meals) {
    if (!result[meal.mealType]) result[meal.mealType] = [];
    result[meal.mealType].push(meal);
  }
  return result;
}

export async function addMeal(
  input: Omit<Meal, 'id' | 'createdAt' | 'date' | 'time'> & { date?: string; time?: string }
): Promise<Meal> {
  if (input.mealKind === 'eatout') {
    if (input.amount === undefined || !Number.isFinite(input.amount) || input.amount < 0) {
      throw new AppError('金額には0以上の数値を入力してください');
    }
  }
  try {
    const db = await getDB();
    const meal: Meal = {
      ...input,
      id: generateId(),
      date: input.date ?? todayDateStr(),
      time: input.time ?? nowTimeStr(),
      createdAt: nowIsoStr(),
    };
    await db.put('meals', meal);
    return meal;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('食事記録の保存に失敗しました');
  }
}

export async function deleteMeal(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('meals', id);
  } catch {
    throw new AppError('食事記録の削除に失敗しました');
  }
}
