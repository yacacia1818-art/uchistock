import type { Ingredient } from '../types';

export const INGREDIENT_CATEGORY_EMOJI: Record<string, string> = {
  野菜: '🥦',
  '肉・魚': '🍗',
  '卵・乳製品': '🥚',
  主食: '🍚',
  その他: '🍽️',
};

export const HOUSEHOLD_CATEGORY_EMOJI: Record<string, string> = {
  '洗剤・掃除用品': '🧴',
  衛生用品: '🧻',
  '薬・医薬品': '💊',
  '文房具・雑貨': '✏️',
  その他: '📦',
};

export function categoryEmojiFor(ingredient: Pick<Ingredient, 'category' | 'itemType'>): string {
  const map = ingredient.itemType === '日用品' ? HOUSEHOLD_CATEGORY_EMOJI : INGREDIENT_CATEGORY_EMOJI;
  return map[ingredient.category] ?? map['その他'];
}

// v1.8: 在庫画面の主分類（保管場所）のアイコン
export const STORAGE_LOCATION_EMOJI: Record<string, string> = {
  冷蔵: '🧊',
  冷凍: '❄️',
  常温: '🗄️',
  日用品: '🧴',
};
