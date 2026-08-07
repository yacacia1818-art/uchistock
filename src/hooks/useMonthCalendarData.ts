import { useEffect, useMemo, useState } from 'react';
import { listMealsByMonth } from '../repositories/mealRepo';
import { listPurchasesByMonth } from '../repositories/purchaseRepo';
import { listCookedDishesByMonth } from '../repositories/cookedDishRepo';
import { listIngredients } from '../repositories/ingredientRepo';
import { getExpiryDates } from '../utils/expiry';
import type { CookedDish, Ingredient, Meal, Purchase } from '../types';

export interface MonthCalendarData {
  meals: Meal[];
  purchases: Purchase[];
  cookedDishes: CookedDish[];
  ingredients: Ingredient[];
  recordedDates: Set<string>;
  expiryByDate: Map<string, Ingredient[]>;
}

// 月間カレンダー（Home / CalendarPage）で共通利用するデータ取得。読み取り専用で、在庫・期限の値自体は変更しない
export function useMonthCalendarData(ym: string, version: number, onError?: (e: unknown) => void): MonthCalendarData {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [cookedDishes, setCookedDishes] = useState<CookedDish[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listMealsByMonth(ym), listPurchasesByMonth(ym), listCookedDishesByMonth(ym), listIngredients()])
      .then(([m, p, c, ing]) => {
        if (cancelled) return;
        setMeals(m);
        setPurchases(p);
        setCookedDishes(c);
        setIngredients(ing);
      })
      .catch((e) => {
        if (!cancelled) onError?.(e);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym, version]);

  const recordedDates = useMemo(() => {
    const set = new Set<string>();
    meals.forEach((m) => set.add(m.date));
    purchases.forEach((p) => set.add(p.date));
    cookedDishes.forEach((c) => set.add(c.date));
    return set;
  }, [meals, purchases, cookedDishes]);

  const expiryByDate = useMemo(() => {
    const map = new Map<string, Ingredient[]>();
    for (const ing of ingredients) {
      if (ing.quantity <= 0) continue;
      for (const date of getExpiryDates(ing)) {
        if (!map.has(date)) map.set(date, []);
        map.get(date)!.push(ing);
      }
    }
    return map;
  }, [ingredients]);

  return { meals, purchases, cookedDishes, ingredients, recordedDates, expiryByDate };
}
