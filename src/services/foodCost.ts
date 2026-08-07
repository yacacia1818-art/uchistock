import { listPurchasesByDateRange } from '../repositories/purchaseRepo';
import { listMealsByDateRange } from '../repositories/mealRepo';
import type { Meal, Purchase } from '../types';
import type { Period } from '../utils/period';

export interface PeriodCost {
  used: number;
  purchases: Purchase[];
  eatOutMeals: Meal[];
}

// 食費として計上する金額（食品・日用品の内訳指定がある場合はfoodAmountのみを食費に含める）
function foodPortionOf(purchase: Purchase): number {
  return purchase.foodAmount ?? purchase.totalAmount;
}

export async function getPeriodCost(period: Period): Promise<PeriodCost> {
  const [purchases, meals] = await Promise.all([
    listPurchasesByDateRange(period.start, period.end),
    listMealsByDateRange(period.start, period.end),
  ]);
  const eatOutMeals = meals.filter((m) => m.mealKind === 'eatout' && m.amount);
  const purchaseTotal = purchases.reduce((sum, p) => sum + foodPortionOf(p), 0);
  const eatOutTotal = eatOutMeals.reduce((sum, m) => sum + (m.amount ?? 0), 0);
  return { used: purchaseTotal + eatOutTotal, purchases, eatOutMeals };
}

export { foodPortionOf };
