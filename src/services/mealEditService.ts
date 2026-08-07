import { updateMeal } from '../repositories/mealRepo';
import {
  getCookedDish,
  consumeCookedDishServing,
  restoreCookedDishServing,
  updateCookedDish,
} from '../repositories/cookedDishRepo';
import { listIngredients } from '../repositories/ingredientRepo';
import { validateUsageDiff, applyUsageDiff } from './usageDiffService';
import { AppError } from '../utils/errors';
import type { IngredientUsage, Meal, MealHomeSource, MealType } from '../types';

export interface MealEditFormState {
  date: string;
  mealType: MealType;
  mealKind: 'home' | 'eatout';
  homeSource: MealHomeSource;
  directUsages: IngredientUsage[];
  selectedDishId: string;
  freeTextItems: string[];
  dishName: string;
  memo: string;
  amount?: number;
  storeName: string;
}

// 在庫から直接消費する使用量として扱う（direct/cookNowのみ）。cooked/freeText/外食は在庫に影響しない
function effectiveUsages(kind: 'home' | 'eatout', source: MealHomeSource, usages: IngredientUsage[]): IngredientUsage[] {
  if (kind !== 'home') return [];
  if (source === 'direct' || source === 'cookNow') return usages;
  return [];
}

// 「調理済みから選ぶ」の残数消費対象となるcookedDishId（cookNowは別枠で同期するのでここには含めない）
function effectiveCookedDishId(kind: 'home' | 'eatout', source: MealHomeSource, dishId?: string): string | undefined {
  if (kind !== 'home' || source !== 'cooked') return undefined;
  return dishId || undefined;
}

// 既存の食事記録を安全に更新する：食材使用量・調理済み料理消費量ともに編集前後の差分だけ補正する
export async function updateMealWithInventory(original: Meal, form: MealEditFormState): Promise<Meal> {
  if (form.mealKind === 'eatout') {
    if (form.amount === undefined || !Number.isFinite(form.amount) || form.amount < 0) {
      throw new AppError('金額には0以上の数値を入力してください');
    }
  }
  if (form.mealKind === 'home' && form.homeSource === 'cooked' && !form.selectedDishId) {
    throw new AppError('調理済み料理を選択してください');
  }
  if (
    form.mealKind === 'home' &&
    (form.homeSource === 'direct' || form.homeSource === 'cookNow') &&
    form.directUsages.length === 0
  ) {
    throw new AppError('食べたものを選択してください');
  }
  if (
    form.mealKind === 'home' &&
    form.homeSource === 'freeText' &&
    form.freeTextItems.length === 0 &&
    !form.dishName.trim()
  ) {
    throw new AppError('食べたものを入力してください');
  }

  const oldSource = original.homeSource ?? 'direct';
  const oldUsages = effectiveUsages(original.mealKind, oldSource, original.ingredientUsages ?? []);
  const newUsages = effectiveUsages(form.mealKind, form.homeSource, form.directUsages);

  const ingredients = await listIngredients();
  const ingredientsById = new Map(ingredients.map((i) => [i.id, i]));
  const insufficient = validateUsageDiff(oldUsages, newUsages, ingredientsById);
  if (insufficient.length > 0) {
    throw new AppError(`${insufficient.join('・')}の在庫が不足しています`);
  }

  const oldDishId = effectiveCookedDishId(original.mealKind, oldSource, original.cookedDishId);
  const newDishId = effectiveCookedDishId(form.mealKind, form.homeSource, form.selectedDishId);

  let cookedDishName: string | undefined;
  if (newDishId) {
    const dish = await getCookedDish(newDishId);
    if (!dish) throw new AppError('選択した調理済み料理が見つかりません');
    if (newDishId !== oldDishId && dish.servingsRemaining !== undefined && dish.servingsRemaining < 1) {
      throw new AppError(`${dish.name}の残りがありません`);
    }
    cookedDishName = dish.name;
  }

  // 1) 食材在庫を差分だけ補正
  await applyUsageDiff(oldUsages, newUsages);

  // 2) 「調理済みから選ぶ」の残数を差分だけ補正
  if (oldDishId !== newDishId) {
    if (oldDishId) await restoreCookedDishServing(oldDishId);
    if (newDishId) await consumeCookedDishServing(newDishId);
  }

  // 3) 「今作って食べた」で紐づく調理記録があれば内容を同期する（関連IDがある場合のみ・別記録の推測書き換えはしない）
  if (oldSource === 'cookNow' && original.cookedDishId && form.homeSource === 'cookNow') {
    const linkedDish = await getCookedDish(original.cookedDishId);
    if (linkedDish) {
      await updateCookedDish({
        ...linkedDish,
        name: form.dishName.trim() || linkedDish.name,
        ingredientUsages: form.directUsages,
        memo: form.memo.trim() || undefined,
      });
    }
  }

  const ingredientNames =
    form.mealKind === 'eatout'
      ? undefined
      : form.homeSource === 'freeText'
        ? form.freeTextItems
        : form.homeSource === 'cooked'
          ? [cookedDishName ?? '調理済み料理']
          : form.directUsages.map((u) => u.ingredientName);

  const updated: Meal = {
    ...original,
    date: form.date,
    mealType: form.mealType,
    mealKind: form.mealKind,
    homeSource: form.mealKind === 'home' ? form.homeSource : undefined,
    ingredientUsages: newUsages.length > 0 ? newUsages : undefined,
    cookedDishId: newDishId ?? (form.homeSource === 'cookNow' ? original.cookedDishId : undefined),
    freeTextItems: form.mealKind === 'home' && form.homeSource === 'freeText' ? form.freeTextItems : undefined,
    ingredientNames,
    dishName:
      form.mealKind === 'home' && form.homeSource === 'cooked' ? cookedDishName : form.dishName.trim() || undefined,
    memo: form.memo.trim() || undefined,
    amount: form.mealKind === 'eatout' ? form.amount : undefined,
    storeName: form.mealKind === 'eatout' ? form.storeName.trim() || undefined : undefined,
  };
  return updateMeal(updated);
}
