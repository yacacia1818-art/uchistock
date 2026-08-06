import { listPurchasesByMonth } from '../repositories/purchaseRepo';
import { listMealsByMonth } from '../repositories/mealRepo';
import type { Meal, Purchase } from '../types';

export interface MonthlyCost {
  used: number;
  purchases: Purchase[];
  eatOutMeals: Meal[];
}

export async function getMonthlyCost(ym: string): Promise<MonthlyCost> {
  const [purchases, meals] = await Promise.all([
    listPurchasesByMonth(ym),
    listMealsByMonth(ym),
  ]);
  const eatOutMeals = meals.filter((m) => m.mealKind === 'eatout' && m.amount);
  const purchaseTotal = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const eatOutTotal = eatOutMeals.reduce((sum, m) => sum + (m.amount ?? 0), 0);
  return { used: purchaseTotal + eatOutTotal, purchases, eatOutMeals };
}
