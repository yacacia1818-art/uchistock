import type { Meal } from '../types';

// 食事記録の1行サマリー（ホーム/記録一覧などで共通利用）
export function mealContentLabel(meal: Meal): string {
  if (meal.mealKind === 'eatout') {
    return meal.dishName ? meal.dishName : '外食';
  }
  if (meal.dishName) return meal.dishName;
  if (meal.ingredientNames && meal.ingredientNames.length > 0) return meal.ingredientNames.join('・');
  return '記録あり';
}

// 記録一覧の補足テキスト（外食の金額・店名など）
export function mealSubLabel(meal: Meal): string | undefined {
  if (meal.mealKind === 'eatout') {
    const parts: string[] = [];
    if (meal.amount !== undefined) parts.push(`¥${meal.amount.toLocaleString()}`);
    if (meal.storeName) parts.push(meal.storeName);
    return parts.length > 0 ? parts.join(' ・ ') : undefined;
  }
  return undefined;
}
