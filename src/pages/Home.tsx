import { useEffect, useState } from 'react';
import { Utensils, ShoppingCart, Bell, ChevronRight, Sun, Moon, Cookie } from 'lucide-react';
import { Header } from '../components/Header';
import { MealFormSheet } from '../components/MealFormSheet';
import { PurchaseFormSheet } from '../components/PurchaseFormSheet';
import { getSettings } from '../repositories/settingsRepo';
import { getTodayMealsGroupedByType } from '../repositories/mealRepo';
import { listIngredients } from '../repositories/ingredientRepo';
import { getPeriodCost } from '../services/foodCost';
import { getCurrentPeriod, formatPeriodRangeLabel, remainingDaysInPeriod } from '../utils/period';
import { getEarliestExpiry, daysUntil, formatExpiryRelative } from '../utils/expiry';
import { useDataVersion } from '../hooks/useDataVersion';
import { useToast } from '../components/ToastProvider';
import { toUserMessage } from '../utils/errors';
import { mealContentLabel } from '../utils/mealDisplay';
import type { Ingredient, Meal, MealType } from '../types';

const MEAL_ROWS: { type: MealType; icon: typeof Sun }[] = [
  { type: '朝食', icon: Sun },
  { type: '昼食', icon: Sun },
  { type: '夕食', icon: Moon },
  { type: '間食', icon: Cookie },
];

const EXPIRY_WARNING_DAYS = 3;

export function Home() {
  const { showToast } = useToast();
  const version = useDataVersion();
  const [budget, setBudget] = useState(15000);
  const [used, setUsed] = useState(0);
  const [startDay, setStartDay] = useState(1);
  const [todayMeals, setTodayMeals] = useState<Record<string, Meal[]>>({});
  const [expiringIngredients, setExpiringIngredients] = useState<{ ingredient: Ingredient; days: number }[]>([]);
  const [showMealForm, setShowMealForm] = useState<MealType | null>(null);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const settings = await getSettings();
        const period = getCurrentPeriod(settings.budgetStartDay);
        const [cost, meals, ingredients] = await Promise.all([
          getPeriodCost(period),
          getTodayMealsGroupedByType(),
          listIngredients(),
        ]);
        if (cancelled) return;
        setBudget(settings.monthlyBudget);
        setStartDay(settings.budgetStartDay ?? 1);
        setUsed(cost.used);
        setTodayMeals(meals);
        const expiring = ingredients
          .filter((i) => i.quantity > 0)
          .map((i) => {
            const earliest = getEarliestExpiry(i);
            if (!earliest) return null;
            const days = daysUntil(earliest);
            return days <= EXPIRY_WARNING_DAYS ? { ingredient: i, days } : null;
          })
          .filter((x): x is { ingredient: Ingredient; days: number } => x !== null)
          .sort((a, b) => a.days - b.days);
        setExpiringIngredients(expiring);
      } catch (e) {
        showToast(toUserMessage(e, 'データの読み込みに失敗しました'));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [version, showToast]);

  const period = getCurrentPeriod(startDay);
  const periodLabel = startDay === 1 ? '今月の食費' : '今期の食費';
  const remaining = budget - used;
  const progress = budget > 0 ? Math.min(100, Math.round((used / budget) * 100)) : 0;
  const perDay = Math.max(0, Math.floor(remaining / remainingDaysInPeriod(period)));

  function mealSummary(meals: Meal[] | undefined): string {
    if (!meals || meals.length === 0) return '未記録';
    return meals.map(mealContentLabel).join('・');
  }

  return (
    <>
      <Header
        icon={<span style={{ fontSize: 22 }}>🍙</span>}
        title="メシログ"
        actions={
          <button className="icon-btn" aria-label="お知らせ">
            <Bell size={20} />
          </button>
        }
      />
      <div className="page-content">
        <div className="card mb-16">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="section-title" style={{ marginBottom: 0 }}>
              {periodLabel}
            </span>
            <span className="text-muted" style={{ fontSize: 12 }}>
              予算 ¥{budget.toLocaleString()}
            </span>
          </div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
            {formatPeriodRangeLabel(period)}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 6 }}>
            ¥{used.toLocaleString()}
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-muted)' }}>
              {' '}
              / ¥{budget.toLocaleString()}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span className={remaining < 0 ? '' : 'text-muted'} style={remaining < 0 ? { color: 'var(--color-danger)', fontWeight: 700 } : undefined}>
              残り ¥{remaining.toLocaleString()}
            </span>
            {remaining >= 0 && <span className="text-muted">1日あたり目安 ¥{perDay.toLocaleString()}</span>}
          </div>
        </div>

        <div className="fab-row">
          <button className="fab orange" onClick={() => setShowMealForm('朝食')}>
            <Utensils size={22} />
            ＋ 食事を記録
            <span style={{ fontWeight: 500, fontSize: 11, opacity: 0.9 }}>食べたものを記録</span>
          </button>
          <button className="fab green" onClick={() => setShowPurchaseForm(true)}>
            <ShoppingCart size={22} />
            ＋ 買いを記録
            <span style={{ fontWeight: 500, fontSize: 11, opacity: 0.9 }}>買ったものを記録</span>
          </button>
        </div>

        {expiringIngredients.length > 0 && (
          <div className="card mb-16">
            <div className="section-title">⏰ 期限が近い食材</div>
            {expiringIngredients.slice(0, 5).map(({ ingredient, days }) => (
              <div className="link-row" key={ingredient.id}>
                <span>{ingredient.name}</span>
                <span
                  className={days < 0 ? '' : 'text-muted'}
                  style={days < 0 ? { color: 'var(--color-danger)', fontWeight: 700 } : undefined}
                >
                  {formatExpiryRelative(days)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="card">
          <div className="section-title">🍴 今日のごはん</div>
          {MEAL_ROWS.map(({ type, icon: Icon }) => (
            <button
              key={type}
              className="link-row"
              style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', font: 'inherit' }}
              onClick={() => setShowMealForm(type)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon size={16} />
                {type}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className={todayMeals[type]?.length ? '' : 'text-muted'}>{mealSummary(todayMeals[type])}</span>
                <ChevronRight size={16} className="text-muted" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {showMealForm && (
        <MealFormSheet initialMealType={showMealForm} onClose={() => setShowMealForm(null)} />
      )}
      {showPurchaseForm && <PurchaseFormSheet onClose={() => setShowPurchaseForm(false)} />}
    </>
  );
}
