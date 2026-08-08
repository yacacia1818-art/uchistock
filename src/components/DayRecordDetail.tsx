import { formatDateLabel } from '../utils/date';
import { mealContentLabel } from '../utils/mealDisplay';
import { formatQuantity } from '../utils/quantity';
import { foodPortionOf } from '../services/foodCost';
import type { CookedDish, Ingredient, Meal, MealType, Purchase } from '../types';

const MEAL_ORDER: MealType[] = ['朝食', '昼食', '夕食', '間食'];

interface DayRecordDetailProps {
  selectedDate: string;
  meals: Meal[];
  purchases: Purchase[];
  cookedDishes: CookedDish[];
  expiringIngredients: Ingredient[];
  // 食事管理OFFのときは食事記録を表示しない（記録自体は削除しない）
  mealTrackingEnabled?: boolean;
}

// 選択日の記録（食事・調理・買い物・期限）を表示。Home / CalendarPage で共通利用
export function DayRecordDetail({
  selectedDate,
  meals,
  purchases,
  cookedDishes,
  expiringIngredients,
  mealTrackingEnabled = true,
}: DayRecordDetailProps) {
  const dayMeals = mealTrackingEnabled
    ? meals
        .filter((m) => m.date === selectedDate)
        .sort((a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType))
    : [];
  const dayPurchases = purchases.filter((p) => p.date === selectedDate);
  const dayCooking = cookedDishes.filter((c) => c.date === selectedDate);

  return (
    <div className="card">
      <div className="section-title">{formatDateLabel(selectedDate)}の記録</div>
      {dayMeals.length === 0 && dayPurchases.length === 0 && dayCooking.length === 0 && expiringIngredients.length === 0 ? (
        <div className="empty-state">記録がありません</div>
      ) : (
        <>
          {expiringIngredients.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>
                【期限】
              </div>
              {expiringIngredients.map((ing) => (
                <div className="link-row" key={ing.id}>
                  <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>期限</span>
                  <span>
                    {ing.name}（{formatQuantity(ing.quantity, ing.unit)}）
                  </span>
                </div>
              ))}
            </div>
          )}
          {dayMeals.map((m) => (
            <div className="link-row" key={m.id}>
              <span style={{ color: 'var(--color-primary-dark)', fontWeight: 700 }}>{m.mealType}</span>
              <span>
                {mealContentLabel(m)}
                {m.mealKind === 'eatout' && m.amount !== undefined && ` ・ ¥${m.amount.toLocaleString()}`}
              </span>
            </div>
          ))}
          {dayCooking.map((c) => (
            <div className="link-row" key={c.id}>
              <span style={{ color: 'var(--color-primary-dark)', fontWeight: 700 }}>調理</span>
              <span>
                {c.name}
                {c.ingredientUsages.length > 0 &&
                  `（${c.ingredientUsages.map((u) => `${u.ingredientName} ${formatQuantity(u.usage.value, u.unit)}`).join('・')}）`}
              </span>
            </div>
          ))}
          {dayPurchases.map((p) => (
            <div className="link-row" key={p.id}>
              <span style={{ color: 'var(--color-primary-dark)', fontWeight: 700 }}>買い物</span>
              <span>
                ¥{p.totalAmount.toLocaleString()}
                {p.foodAmount !== undefined && p.foodAmount !== p.totalAmount && `（食費 ¥${foodPortionOf(p).toLocaleString()}）`}
                {p.storeName && `（${p.storeName}）`}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
