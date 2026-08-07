import { updateCookedDish } from '../repositories/cookedDishRepo';
import { listIngredients } from '../repositories/ingredientRepo';
import { listMeals, updateMeal } from '../repositories/mealRepo';
import { validateUsageDiff, applyUsageDiff } from './usageDiffService';
import { AppError } from '../utils/errors';
import type { CookedDish, IngredientUsage } from '../types';

export interface CookingEditFormState {
  date: string;
  name: string;
  usages: IngredientUsage[];
  servings?: number;
  memo: string;
}

// 作った量（servings）変更時に、既に消費した食数を失わないよう残数を安全に再計算する
function recalcServingsRemaining(dish: CookedDish, newServings?: number): number | undefined {
  if (newServings === undefined) return undefined;
  const consumed = dish.servings !== undefined ? dish.servings - (dish.servingsRemaining ?? dish.servings) : 0;
  return Math.max(0, Math.min(newServings, newServings - consumed));
}

// 既存の調理記録を安全に更新する：使用食材は編集前後の差分だけ在庫を補正し、
// 「今作って食べた」で紐づく食事記録があれば内容を同期する
export async function updateCookingWithInventory(original: CookedDish, form: CookingEditFormState): Promise<CookedDish> {
  if (!form.name.trim()) throw new AppError('料理名を入力してください');
  if (form.usages.length === 0) throw new AppError('使用した食材を選択してください');
  if (form.servings !== undefined && (!Number.isFinite(form.servings) || form.servings <= 0)) {
    throw new AppError('完成量には1以上の数値を入力してください');
  }

  const ingredients = await listIngredients();
  const ingredientsById = new Map(ingredients.map((i) => [i.id, i]));
  const insufficient = validateUsageDiff(original.ingredientUsages, form.usages, ingredientsById);
  if (insufficient.length > 0) {
    throw new AppError(`${insufficient.join('・')}の在庫が不足しています`);
  }

  await applyUsageDiff(original.ingredientUsages, form.usages);

  const servingsRemaining = recalcServingsRemaining(original, form.servings);
  const updated: CookedDish = {
    ...original,
    date: form.date,
    name: form.name.trim(),
    ingredientUsages: form.usages,
    servings: form.servings,
    servingsRemaining,
    memo: form.memo.trim() || undefined,
  };
  await updateCookedDish(updated);

  // 「今作って食べた」で紐づく食事記録があれば内容を同期する（関連IDで見つかった場合のみ・推測での書き換えはしない）
  const meals = await listMeals();
  const linkedMeal = meals.find((m) => m.homeSource === 'cookNow' && m.cookedDishId === original.id);
  if (linkedMeal) {
    await updateMeal({
      ...linkedMeal,
      ingredientUsages: form.usages,
      ingredientNames: [updated.name],
      dishName: updated.name,
    });
  }

  return updated;
}
