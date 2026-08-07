import { getSettings } from '../repositories/settingsRepo';
import { listIngredients } from '../repositories/ingredientRepo';
import { listShoppingMemo } from '../repositories/shoppingMemoRepo';
import { listMeals } from '../repositories/mealRepo';
import { listCookedDishes } from '../repositories/cookedDishRepo';
import { getMonthlyCost } from './foodCost';
import { currentYearMonth, formatDateLabel } from '../utils/date';
import { formatQuantity, formatUsage } from '../utils/quantity';
import { mealContentLabel } from '../utils/mealDisplay';
import type { Ingredient, Meal, CookedDish } from '../types';

export type AiConsultTopic = 'menu' | 'nutrition' | 'shopping' | 'saving' | 'useup' | 'all';

const TOPIC_QUESTIONS: Record<AiConsultTopic, string> = {
  menu:
    '現在の在庫と調理済み料理を優先し、できるだけ追加購入を減らしながら作れる献立を提案してください。最近の食事と重複しすぎないようにしてください。',
  nutrition:
    '最近の朝食・昼食・夕食・間食を確認し、不足していそうな食品群や偏りを指摘してください。必要なら次回買うとよい食材を提案してください。',
  shopping:
    '現在の在庫、調理済み料理、買い物メモ、今月の残り食費を確認し、次回の買い物で優先して買うものを提案してください。不要な買い足しは避けてください。',
  saving:
    '今月の予算、食材購入額、外食額、残り予算を確認し、残りの日数を考慮して食費を抑える方法を提案してください。現在ある食材をできるだけ使い切る方向で考えてください。',
  useup:
    '現在の食材と調理済み料理を確認し、食材を無駄にしないために優先して使うものと、作れる料理を提案してください。',
  all: '現在の食費・食材・調理済み料理・最近の食事・最近の調理・買い物メモ・最近の買い物をふまえて、アドバイスをください。',
};

function formatIngredientLine(i: Ingredient): string {
  return `・${i.name}：${formatQuantity(i.quantity, i.unit)}`;
}

function formatCookedDishLine(d: CookedDish): string {
  if (d.servings === undefined) return `・${d.name}：残量未設定`;
  return `・${d.name}：残り${d.servingsRemaining ?? 0}食`;
}

function eatoutDetail(m: Meal): string {
  const parts: string[] = [];
  if (m.dishName) parts.push(`料理：${m.dishName}`);
  if (m.amount !== undefined) parts.push(`金額：${m.amount.toLocaleString()}円`);
  if (m.storeName) parts.push(`店名：${m.storeName}`);
  if (parts.length === 0) return `${m.mealType}：外食`;
  return `${m.mealType}：外食\n  ${parts.join(' / ')}`;
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
      if (m.mealKind === 'eatout') {
        lines.push(eatoutDetail(m));
      } else {
        lines.push(`${m.mealType}：${mealContentLabel(m)}`);
      }
    }
  }
  return lines.join('\n');
}

function formatCookingHistory(dishes: CookedDish[]): string {
  const recent = dishes.slice(0, 3);
  const lines: string[] = [];
  for (const d of recent) {
    lines.push(formatDateLabel(d.date).replace(/（.*）/, ''));
    lines.push(d.name);
    if (d.ingredientUsages.length > 0) {
      lines.push('使用：');
      for (const u of d.ingredientUsages) {
        lines.push(`・${u.ingredientName} ${formatUsage(u.usage, u.unit)}`);
      }
    }
  }
  return lines.join('\n');
}

export async function buildAiConsultText(topic: AiConsultTopic): Promise<string> {
  const ym = currentYearMonth();
  const [settings, ingredients, memo, meals, cookedDishes, cost] = await Promise.all([
    getSettings(),
    listIngredients(),
    listShoppingMemo(),
    listMeals(),
    listCookedDishes(),
    getMonthlyCost(ym),
  ]);

  const remaining = settings.monthlyBudget - cost.used;
  const purchaseTotal = cost.purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const eatOutTotal = cost.eatOutMeals.reduce((sum, m) => sum + (m.amount ?? 0), 0);

  const sections: string[] = [];

  sections.push(
    [
      '【今月の食費】',
      `予算：${settings.monthlyBudget.toLocaleString()}円`,
      `使用額：${cost.used.toLocaleString()}円`,
      `残り：${remaining.toLocaleString()}円`,
      `食材購入額：${purchaseTotal.toLocaleString()}円`,
      `外食額：${eatOutTotal.toLocaleString()}円`,
    ].join('\n')
  );

  const activeIngredients = ingredients.filter((i) => i.quantity > 0);
  sections.push(
    [
      '【現在の食材】',
      ...(activeIngredients.length > 0 ? activeIngredients.map(formatIngredientLine) : ['なし']),
    ].join('\n')
  );

  const availableDishes = cookedDishes.filter((d) => d.servingsRemaining === undefined || d.servingsRemaining > 0);
  sections.push(
    ['【調理済み料理】', ...(availableDishes.length > 0 ? availableDishes.map(formatCookedDishLine) : ['なし'])].join(
      '\n'
    )
  );

  const mealText = meals.length > 0 ? formatMealsByDate(meals) : '';
  sections.push(['【最近の食事】', mealText || 'なし'].join('\n'));

  const cookingText = cookedDishes.length > 0 ? formatCookingHistory(cookedDishes) : '';
  sections.push(['【最近の調理】', cookingText || 'なし'].join('\n'));

  const uncheckedMemo = memo.filter((m) => !m.checked);
  sections.push(
    [
      '【買い物メモ】',
      ...(uncheckedMemo.length > 0
        ? uncheckedMemo.map((m) => `・${m.name}${m.quantity ? ' ' + m.quantity : ''}`)
        : ['なし']),
    ].join('\n')
  );

  const recentPurchases = cost.purchases.slice(0, 5);
  sections.push(
    [
      '【最近の買い物】',
      ...(recentPurchases.length > 0
        ? recentPurchases.map(
            (p) =>
              `・${formatDateLabel(p.date).replace(/（.*）/, '')} ${p.totalAmount.toLocaleString()}円${p.storeName ? `（${p.storeName}）` : ''}`
          )
        : ['なし']),
    ].join('\n')
  );

  sections.push(['【相談】', TOPIC_QUESTIONS[topic]].join('\n'));

  return sections.join('\n\n');
}
