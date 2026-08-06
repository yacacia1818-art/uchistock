import { useEffect, useState } from 'react';
import { Utensils, ShoppingCart, Bell, ChevronRight, Sun, Moon, Cookie } from 'lucide-react';
import { Header } from '../components/Header';
import { MealFormSheet } from '../components/MealFormSheet';
import { PurchaseFormSheet } from '../components/PurchaseFormSheet';
import { getSettings } from '../repositories/settingsRepo';
import { getTodayMealsByType } from '../repositories/mealRepo';
import { getMonthlyCost } from '../services/foodCost';
import { currentYearMonth, remainingDaysInMonth } from '../utils/date';
import { useDataVersion } from '../hooks/useDataVersion';
import { useToast } from '../components/ToastProvider';
import { toUserMessage } from '../utils/errors';
import type { Meal, MealType } from '../types';

const MEAL_ROWS: { type: MealType; icon: typeof Sun }[] = [
  { type: '朝食', icon: Sun },
  { type: '昼食', icon: Sun },
  { type: '夕食', icon: Moon },
  { type: '間食', icon: Cookie },
];

export function Home() {
  const { showToast } = useToast();
  const version = useDataVersion();
  const [budget, setBudget] = useState(15000);
  const [used, setUsed] = useState(0);
  const [todayMeals, setTodayMeals] = useState<Record<string, Meal | undefined>>({});
  const [showMealForm, setShowMealForm] = useState<MealType | null>(null);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [settings, cost, meals] = await Promise.all([
          getSettings(),
          getMonthlyCost(currentYearMonth()),
          getTodayMealsByType(),
        ]);
        if (cancelled) return;
        setBudget(settings.monthlyBudget);
        setUsed(cost.used);
        setTodayMeals(meals);
      } catch (e) {
        showToast(toUserMessage(e, 'データの読み込みに失敗しました'));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [version, showToast]);

  const remaining = budget - used;
  const progress = budget > 0 ? Math.min(100, Math.round((used / budget) * 100)) : 0;
  const perDay = Math.max(0, Math.floor(remaining / remainingDaysInMonth()));

  function mealSummary(meal: Meal | undefined): string {
    if (!meal) return '未記録';
    if (meal.dishName) return meal.dishName;
    if (meal.mealKind === 'home' && meal.ingredientNames && meal.ingredientNames.length > 0) {
      return meal.ingredientNames.join('・');
    }
    if (meal.mealKind === 'eatout') return '外食';
    return '記録あり';
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
              今月の食費
            </span>
            <span className="text-muted" style={{ fontSize: 12 }}>
              予算 ¥{budget.toLocaleString()}
            </span>
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
                <span className={todayMeals[type] ? '' : 'text-muted'}>{mealSummary(todayMeals[type])}</span>
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
