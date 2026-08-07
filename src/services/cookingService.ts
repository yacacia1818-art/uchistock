import { addCookedDish, consumeCookedDishServing } from '../repositories/cookedDishRepo';
import { decrementIngredientQuantity } from '../repositories/ingredientRepo';
import { addMeal } from '../repositories/mealRepo';
import type { CookedDish, IngredientUsage, Meal, MealType } from '../types';

async function decrementAll(usages: IngredientUsage[]): Promise<void> {
  for (const usage of usages) {
    await decrementIngredientQuantity(usage.ingredientId, usage.usage.value);
  }
}

interface CookDishInput {
  name: string;
  ingredientUsages: IngredientUsage[];
  servings?: number;
  memo?: string;
}

// 調理登録：食材在庫を減らし、調理済み料理として保存する
export async function cookDish(input: CookDishInput): Promise<CookedDish> {
  await decrementAll(input.ingredientUsages);
  return addCookedDish({
    name: input.name,
    ingredientUsages: input.ingredientUsages,
    servings: input.servings,
    servingsRemaining: input.servings,
    memo: input.memo,
  });
}

interface CookAndEatNowInput {
  name: string;
  ingredientUsages: IngredientUsage[];
  mealType: MealType;
  memo?: string;
}

// 「今作って食べた」：調理記録・在庫減算・食事記録を一括で行う
export async function cookAndEatNow(input: CookAndEatNowInput): Promise<{ dish: CookedDish; meal: Meal }> {
  await decrementAll(input.ingredientUsages);
  const dish = await addCookedDish({
    name: input.name,
    ingredientUsages: input.ingredientUsages,
    servings: 1,
    servingsRemaining: 0,
    memo: input.memo,
  });
  const meal = await addMeal({
    mealType: input.mealType,
    mealKind: 'home',
    homeSource: 'cookNow',
    ingredientUsages: input.ingredientUsages,
    cookedDishId: dish.id,
    ingredientNames: [dish.name],
    dishName: dish.name,
    memo: input.memo,
  });
  return { dish, meal };
}

export { consumeCookedDishServing };
