import { listIngredients } from '../repositories/ingredientRepo';
import { getEarliestExpiry, daysUntil } from '../utils/expiry';
import type { Ingredient } from '../types';

export interface ExpiringIngredient {
  ingredient: Ingredient;
  days: number;
}

// 在庫が残っている食材のうち期限が設定されているものを、期限が近い順（期限切れが先頭）で返す
export async function listExpiringIngredients(): Promise<ExpiringIngredient[]> {
  const ingredients = await listIngredients();
  return ingredients
    .filter((i) => i.quantity > 0)
    .map((i) => {
      const earliest = getEarliestExpiry(i);
      if (!earliest) return null;
      return { ingredient: i, days: daysUntil(earliest) };
    })
    .filter((x): x is ExpiringIngredient => x !== null)
    .sort((a, b) => a.days - b.days);
}
