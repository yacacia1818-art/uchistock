import { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '../components/Header';
import { listMealsByMonth } from '../repositories/mealRepo';
import { listPurchasesByMonth } from '../repositories/purchaseRepo';
import { listCookedDishesByMonth } from '../repositories/cookedDishRepo';
import { listIngredients } from '../repositories/ingredientRepo';
import { getSettings } from '../repositories/settingsRepo';
import { getPeriodCost, foodPortionOf } from '../services/foodCost';
import { getCurrentPeriod, formatPeriodRangeLabel } from '../utils/period';
import { getExpiryDates } from '../utils/expiry';
import {
  addMonths,
  currentYearMonth,
  daysInMonth,
  formatDateLabel,
  formatMonthLabel,
  todayDateStr,
} from '../utils/date';
import { useDataVersion } from '../hooks/useDataVersion';
import { useToast } from '../components/ToastProvider';
import { toUserMessage } from '../utils/errors';
import { mealContentLabel } from '../utils/mealDisplay';
import { formatQuantity } from '../utils/quantity';
import type { CookedDish, Ingredient, Meal, MealType, Purchase } from '../types';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const MEAL_ORDER: MealType[] = ['朝食', '昼食', '夕食', '間食'];

export function CalendarPage() {
  const { showToast } = useToast();
  const version = useDataVersion();
  const [ym, setYm] = useState(currentYearMonth());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [cookedDishes, setCookedDishes] = useState<CookedDish[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [budget, setBudget] = useState(15000);
  const [periodUsed, setPeriodUsed] = useState(0);
  const [periodLabel, setPeriodLabel] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr());

  useEffect(() => {
    Promise.all([
      listMealsByMonth(ym),
      listPurchasesByMonth(ym),
      listCookedDishesByMonth(ym),
      listIngredients(),
      getSettings(),
    ])
      .then(async ([m, p, c, ing, s]) => {
        setMeals(m);
        setPurchases(p);
        setCookedDishes(c);
        setIngredients(ing);
        setBudget(s.monthlyBudget);
        const period = getCurrentPeriod(s.budgetStartDay);
        setPeriodLabel(formatPeriodRangeLabel(period));
        const cost = await getPeriodCost(period);
        setPeriodUsed(cost.used);
      })
      .catch((e) => showToast(toUserMessage(e, 'データの読み込みに失敗しました')));
  }, [ym, version, showToast]);

  const remaining = budget - periodUsed;

  const expiryByDate = useMemo(() => {
    const map = new Map<string, Ingredient[]>();
    for (const ing of ingredients) {
      if (ing.quantity <= 0) continue;
      for (const date of getExpiryDates(ing)) {
        if (!map.has(date)) map.set(date, []);
        map.get(date)!.push(ing);
      }
    }
    return map;
  }, [ingredients]);

  const recordedDates = useMemo(() => {
    const set = new Set<string>();
    meals.forEach((m) => set.add(m.date));
    purchases.forEach((p) => set.add(p.date));
    cookedDishes.forEach((c) => set.add(c.date));
    return set;
  }, [meals, purchases, cookedDishes]);

  const cells = useMemo(() => {
    const [y, m] = ym.split('-').map(Number);
    const firstDow = new Date(y, m - 1, 1).getDay();
    const total = daysInMonth(ym);
    const result: { date: string | null }[] = [];
    for (let i = 0; i < firstDow; i++) result.push({ date: null });
    for (let d = 1; d <= total; d++) {
      result.push({ date: `${ym}-${String(d).padStart(2, '0')}` });
    }
    return result;
  }, [ym]);

  const today = todayDateStr();

  const dayMeals = meals
    .filter((m) => m.date === selectedDate)
    .sort((a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType));
  const dayPurchases = purchases.filter((p) => p.date === selectedDate);
  const dayCooking = cookedDishes.filter((c) => c.date === selectedDate);
  const dayExpiring = expiryByDate.get(selectedDate) ?? [];

  return (
    <>
      <Header icon={<CalendarIcon size={20} />} title="カレンダー" />
      <div className="page-content">
        <div className="card mb-16">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span>
              使用額 <strong>¥{periodUsed.toLocaleString()}</strong>
            </span>
            <span>
              残り予算 <strong>¥{remaining.toLocaleString()}</strong>
            </span>
          </div>
          {periodLabel && (
            <div className="text-muted mt-8" style={{ fontSize: 12 }}>
              集計期間：{periodLabel}
            </div>
          )}
        </div>

        <div className="card mb-16">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button className="icon-btn" onClick={() => setYm((prev) => addMonths(prev, -1))} aria-label="前の月">
              <ChevronLeft size={18} />
            </button>
            <strong>{formatMonthLabel(ym)}</strong>
            <button className="icon-btn" onClick={() => setYm((prev) => addMonths(prev, 1))} aria-label="次の月">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="calendar-grid">
            {WEEKDAYS.map((w) => (
              <div className="calendar-weekday" key={w}>
                {w}
              </div>
            ))}
            {cells.map((c, idx) => {
              if (!c.date) return <div key={idx} />;
              const isToday = c.date === today;
              const isSelected = c.date === selectedDate;
              const hasRecord = recordedDates.has(c.date);
              const hasExpiry = expiryByDate.has(c.date);
              return (
                <button
                  key={c.date}
                  className={`calendar-cell${isToday ? ' today' : ''}${isSelected && !isToday ? ' selected' : ''}`}
                  onClick={() => setSelectedDate(c.date!)}
                >
                  {Number(c.date.slice(-2))}
                  <span style={{ display: 'flex', gap: 3, height: 5 }}>
                    {hasRecord && <span className="calendar-dot" />}
                    {hasExpiry && <span className="calendar-dot expiry" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="section-title">{formatDateLabel(selectedDate)}の記録</div>
          {dayMeals.length === 0 && dayPurchases.length === 0 && dayCooking.length === 0 && dayExpiring.length === 0 ? (
            <div className="empty-state">記録がありません</div>
          ) : (
            <>
              {dayExpiring.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>
                    【期限】
                  </div>
                  {dayExpiring.map((ing) => (
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
      </div>
    </>
  );
}
