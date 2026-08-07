import { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '../components/Header';
import { listMealsByMonth } from '../repositories/mealRepo';
import { listPurchasesByMonth } from '../repositories/purchaseRepo';
import { listCookedDishesByMonth } from '../repositories/cookedDishRepo';
import { getSettings } from '../repositories/settingsRepo';
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
import type { CookedDish, Meal, MealType, Purchase } from '../types';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const MEAL_ORDER: MealType[] = ['朝食', '昼食', '夕食', '間食'];

export function CalendarPage() {
  const { showToast } = useToast();
  const version = useDataVersion();
  const [ym, setYm] = useState(currentYearMonth());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [cookedDishes, setCookedDishes] = useState<CookedDish[]>([]);
  const [budget, setBudget] = useState(15000);
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr());

  useEffect(() => {
    Promise.all([listMealsByMonth(ym), listPurchasesByMonth(ym), listCookedDishesByMonth(ym), getSettings()])
      .then(([m, p, c, s]) => {
        setMeals(m);
        setPurchases(p);
        setCookedDishes(c);
        setBudget(s.monthlyBudget);
      })
      .catch((e) => showToast(toUserMessage(e, 'データの読み込みに失敗しました')));
  }, [ym, version, showToast]);

  const used = useMemo(() => {
    const purchaseTotal = purchases.reduce((s, p) => s + p.totalAmount, 0);
    const eatOutTotal = meals
      .filter((m) => m.mealKind === 'eatout' && m.amount)
      .reduce((s, m) => s + (m.amount ?? 0), 0);
    return purchaseTotal + eatOutTotal;
  }, [purchases, meals]);
  const remaining = budget - used;

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

  return (
    <>
      <Header icon={<CalendarIcon size={20} />} title="カレンダー" />
      <div className="page-content">
        <div className="card mb-16">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span>
              使用額 <strong>¥{used.toLocaleString()}</strong>
            </span>
            <span>
              残り予算 <strong>¥{remaining.toLocaleString()}</strong>
            </span>
          </div>
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
              return (
                <button
                  key={c.date}
                  className={`calendar-cell${isToday ? ' today' : ''}${isSelected && !isToday ? ' selected' : ''}`}
                  onClick={() => setSelectedDate(c.date!)}
                >
                  {Number(c.date.slice(-2))}
                  {hasRecord ? <span className="calendar-dot" /> : <span style={{ height: 5 }} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="section-title">{formatDateLabel(selectedDate)}の記録</div>
          {dayMeals.length === 0 && dayPurchases.length === 0 && dayCooking.length === 0 ? (
            <div className="empty-state">記録がありません</div>
          ) : (
            <>
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
