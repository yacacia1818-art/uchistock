import { getSettings } from '../repositories/settingsRepo';
import { listIngredients } from '../repositories/ingredientRepo';
import { listShoppingMemo } from '../repositories/shoppingMemoRepo';
import { listMeals } from '../repositories/mealRepo';
import { getMonthlyCost } from './foodCost';
import { currentYearMonth, formatDateLabel } from '../utils/date';
import type { Ingredient, Meal } from '../types';

export type AiConsultTopic = 'menu' | 'nutrition' | 'shopping' | 'saving' | 'useup' | 'all';

const TOPIC_QUESTIONS: Record<AiConsultTopic, string> = {
  menu: '現在の食材を優先して、今日・明日の献立を提案してください。',
  nutrition: '最近の食事の栄養バランスを分析し、不足しがちな栄養素を補う工夫を教えてください。',
  shopping: '買い物メモと在庫状況をふまえて、今買うべきもの・買わなくてよいものを教えてください。',
  saving: '現在の食費・食材・最近の食事をもとに、節約しながら栄養バランスを改善する方法を教えてください。現在ある食材を優先してください。',
  useup: '在庫にある食材を無駄なく使い切るための献立やレシピを提案してください。',
  all: '現在の食費・食材・最近の食事・買い物メモをふまえて、アドバイスをください。',
};

function formatIngredientLine(i: Ingredient): string {
  const amount = i.trackType === 'count' ? `${i.count ?? 0}${i.unit ?? '個'}` : i.roughLevel ?? '';
  return `${i.name}：${amount}`;
}

function formatMealsByDate(meals: Meal[]): string {
  const byDate = new Map<string, Meal[]>();
  for (const m of meals) {
    if (!byDate.has(m.date)) byDate.set(m.date, []);
    byDate.get(m.date)!.push(m);
  }
  const dates = [...byDate.keys()].sort((a, b) => (a < b ? 1 : -1)).slice(0, 3);
  const lines: string[] = [];
  for (const date of dates) {
    lines.push(formatDateLabel(date).replace(/（.*）/, ''));
    const order = ['朝食', '昼食', '夕食', '間食'];
    const dayMeals = byDate.get(date)!.sort((a, b) => order.indexOf(a.mealType) - order.indexOf(b.mealType));
    for (const m of dayMeals) {
      const content =
        m.mealKind === 'home'
          ? (m.dishName ? m.dishName : (m.ingredientNames ?? []).join('・')) || '記録あり'
          : m.dishName || '外食';
      lines.push(`${m.mealType}：${content}`);
    }
  }
  return lines.join('\n');
}

export async function buildAiConsultText(topic: AiConsultTopic): Promise<string> {
  const ym = currentYearMonth();
  const [settings, ingredients, memo, meals, cost] = await Promise.all([
    getSettings(),
    listIngredients(),
    listShoppingMemo(),
    listMeals(),
    getMonthlyCost(ym),
  ]);

  const remaining = settings.monthlyBudget - cost.used;
  const activeIngredients = ingredients.filter((i) => i.roughLevel !== 'なし');

  const sections: string[] = [];

  sections.push(
    [
      '【今月の食費】',
      `予算：${settings.monthlyBudget.toLocaleString()}円`,
      `使用：${cost.used.toLocaleString()}円`,
      `残り：${remaining.toLocaleString()}円`,
    ].join('\n')
  );

  if (activeIngredients.length > 0) {
    sections.push(['【現在の食材】', ...activeIngredients.map(formatIngredientLine)].join('\n'));
  }

  if (meals.length > 0) {
    const mealText = formatMealsByDate(meals);
    if (mealText) sections.push(['【最近の食事】', mealText].join('\n'));
  }

  const uncheckedMemo = memo.filter((m) => !m.checked);
  if (uncheckedMemo.length > 0) {
    sections.push(
      ['【買い物メモ】', ...uncheckedMemo.map((m) => `・${m.name}${m.quantity ? ' ' + m.quantity : ''}`)].join('\n')
    );
  }

  sections.push(['【相談】', TOPIC_QUESTIONS[topic]].join('\n'));

  return sections.join('\n\n');
}
