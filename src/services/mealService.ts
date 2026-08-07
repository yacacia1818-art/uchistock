import { addMeal } from '../repositories/mealRepo';
import { decrementIngredientQuantity } from '../repositories/ingredientRepo';
import { consumeCookedDishServing } from '../repositories/cookedDishRepo';
import type { IngredientUsage, Meal, MealType } from '../types';

interface DirectMealInput {
  mealType: MealType;
  ingredientUsages: IngredientUsage[];
  dishName?: string;
  memo?: string;
}

// A: 在庫から直接食べた（使用分だけ在庫を減らす）
export async function addDirectMeal(input: DirectMealInput): Promise<Meal> {
  for (const usage of input.ingredientUsages) {
    await decrementIngredientQuantity(usage.ingredientId, usage.usage.value);
  }
  return addMeal({
    mealType: input.mealType,
    mealKind: 'home',
    homeSource: 'direct',
    ingredientUsages: input.ingredientUsages,
    ingredientNames: input.ingredientUsages.map((u) => u.ingredientName),
    dishName: input.dishName,
    memo: input.memo,
  });
}

interface CookedMealInput {
  mealType: MealType;
  cookedDishId: string;
  dishName: string;
  memo?: string;
}

// B: 調理済み料理を食べた（元の生食材は再度減らさない）
export async function addCookedMeal(input: CookedMealInput): Promise<Meal> {
  await consumeCookedDishServing(input.cookedDishId);
  return addMeal({
    mealType: input.mealType,
    mealKind: 'home',
    homeSource: 'cooked',
    cookedDishId: input.cookedDishId,
    ingredientNames: [input.dishName],
    dishName: input.dishName,
    memo: input.memo,
  });
}

interface FreeTextMealInput {
  mealType: MealType;
  items: string[];
  dishName?: string;
  memo?: string;
}

// C: 在庫にないものを自由入力（在庫へは追加しない）
export async function addFreeTextMeal(input: FreeTextMealInput): Promise<Meal> {
  return addMeal({
    mealType: input.mealType,
    mealKind: 'home',
    homeSource: 'freeText',
    freeTextItems: input.items,
    ingredientNames: input.items,
    dishName: input.dishName,
    memo: input.memo,
  });
}
