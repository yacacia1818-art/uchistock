import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Utensils,
  ShoppingCart,
  Bell,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Sun,
  Moon,
  Cookie,
  Plus,
  ChefHat,
} from 'lucide-react';
import { Header } from '../components/Header';
import { MealFormSheet } from '../components/MealFormSheet';
import { PurchaseFormSheet } from '../components/PurchaseFormSheet';
import { ExpiryNoticeSheet } from '../components/ExpiryNoticeSheet';
import { AddIngredientSheet } from '../components/AddIngredientSheet';
import { MonthCalendarCard } from '../components/MonthCalendarCard';
import { DayRecordDetail } from '../components/DayRecordDetail';
import { getSettings } from '../repositories/settingsRepo';
import { getTodayMealsGroupedByType } from '../repositories/mealRepo';
import { listAvailableCookedDishes } from '../repositories/cookedDishRepo';
import { getPeriodCost } from '../services/foodCost';
import { listExpiringIngredients, type ExpiringIngredient } from '../services/expirySummary';
import { getCurrentPeriod, formatPeriodRangeLabel, remainingDaysInPeriod } from '../utils/period';
import { formatExpiryRelative } from '../utils/expiry';
import { expiryUrgency, expiryUrgencyIcon, expiryUrgencyStyle } from '../utils/expiryUi';
import { addMonths, currentYearMonth, formatDateLabel, todayDateStr } from '../utils/date';
import { formatQuantity } from '../utils/quantity';
import { useDataVersion } from '../hooks/useDataVersion';
import { useMonthCalendarData } from '../hooks/useMonthCalendarData';
import { useToast } from '../components/ToastProvider';
import { toUserMessage } from '../utils/errors';
import { mealContentLabel } from '../utils/mealDisplay';
import type { CookedDish, Meal, MealType } from '../types';

const MEAL_ROWS: { type: MealType; icon: typeof Sun }[] = [
  { type: '朝食', icon: Sun },
  { type: '昼食', icon: Sun },
  { type: '夕食', icon: Moon },
  { type: '間食', icon: Cookie },
];

const CORE_MEAL_TYPES: MealType[] = ['朝食', '昼食', '夕食'];
const EXPIRY_WARNING_DAYS = 3;
const EXPIRY_LIST_LIMIT = 5;
const MEALS_COLLAPSED_KEY = 'meshi-log:home-meals-collapsed';

export function Home() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const version = useDataVersion();
  const [budget, setBudget] = useState(15000);
  const [used, setUsed] = useState(0);
  const [startDay, setStartDay] = useState(1);
  const [mealTrackingEnabled, setMealTrackingEnabled] = useState(true);
  const [todayMeals, setTodayMeals] = useState<Record<string, Meal[]>>({});
  const [cookedStock, setCookedStock] = useState<CookedDish[]>([]);
  const [bellExpiring, setBellExpiring] = useState<ExpiringIngredient[]>([]);
  const [allExpiring, setAllExpiring] = useState<ExpiringIngredient[]>([]);
  const [showMealForm, setShowMealForm] = useState<MealType | null>(null);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [showNotices, setShowNotices] = useState(false);
  const [showAllExpiring, setShowAllExpiring] = useState(false);
  const [mealsCollapsed, setMealsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(MEALS_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [ym, setYm] = useState(currentYearMonth());
  const [selectedDate, setSelectedDate] = useState(todayDateStr());

  useEffect(() => {
    try {
      localStorage.setItem(MEALS_COLLAPSED_KEY, mealsCollapsed ? '1' : '0');
    } catch {
      // localStorageが使えない環境では無視（開閉状態が保存されないだけ）
    }
  }, [mealsCollapsed]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const settings = await getSettings();
        const period = getCurrentPeriod(settings.budgetStartDay);
        const [cost, meals, expiring, dishes] = await Promise.all([
          getPeriodCost(period),
          getTodayMealsGroupedByType(),
          listExpiringIngredients(),
          listAvailableCookedDishes(),
        ]);
        if (cancelled) return;
        setBudget(settings.monthlyBudget);
        setStartDay(settings.budgetStartDay ?? 1);
        setMealTrackingEnabled(settings.mealTrackingEnabled ?? true);
        setUsed(cost.used);
        setTodayMeals(meals);
        setAllExpiring(expiring);
        setBellExpiring(expiring.filter((e) => e.days <= EXPIRY_WARNING_DAYS));
        setCookedStock(dishes.filter((d) => d.servingsRemaining !== undefined && d.servingsRemaining > 0));
      } catch (e) {
        showToast(toUserMessage(e, 'データの読み込みに失敗しました'));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [version, showToast]);

  const { meals, purchases, cookedDishes, ingredients, recordedDates, expiryByDate } = useMonthCalendarData(
    ym,
    version,
    (e) => showToast(toUserMessage(e, 'データの読み込みに失敗しました'))
  );
  const expiryDates = useMemo(() => new Set(expiryByDate.keys()), [expiryByDate]);
  const dayExpiring = expiryByDate.get(selectedDate) ?? [];
  const activeIngredientCount = ingredients.filter((i) => i.quantity > 0).length;

  const period = getCurrentPeriod(startDay);
  const periodLabel = startDay === 1 ? '今月の食費' : '今期の食費';
  const remaining = budget - used;
  const progress = budget > 0 ? Math.min(100, Math.round((used / budget) * 100)) : 0;
  const perDay = Math.max(0, Math.floor(remaining / remainingDaysInPeriod(period)));

  const recordedCoreMealCount = CORE_MEAL_TYPES.filter((t) => (todayMeals[t]?.length ?? 0) > 0).length;
  const visibleExpiring = showAllExpiring ? allExpiring : allExpiring.slice(0, EXPIRY_LIST_LIMIT);

  function mealSummary(meals: Meal[] | undefined): string {
    if (!meals || meals.length === 0) return '未記録';
    return meals.map(mealContentLabel).join('・');
  }

  return (
    <>
      <Header
        icon={<span style={{ fontSize: 22 }}>📦</span>}
        title="ウチストック"
        subtitle={formatDateLabel(todayDateStr())}
        actions={
          <button
            className="icon-btn"
            aria-label="お知らせ"
            style={{ position: 'relative' }}
            onClick={() => setShowNotices(true)}
          >
            <Bell size={20} />
            {bellExpiring.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  minWidth: 16,
                  height: 16,
                  padding: '0 3px',
                  borderRadius: 999,
                  background: 'var(--color-danger)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}
              >
                {bellExpiring.length}
              </span>
            )}
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
          {mealTrackingEnabled && (
            <button className="fab orange" onClick={() => setShowMealForm('朝食')}>
              <Utensils size={22} />
              ＋ 食事を記録
              <span style={{ fontWeight: 500, fontSize: 11, opacity: 0.9 }}>食べたものを記録</span>
            </button>
          )}
          <button className="fab green" onClick={() => setShowPurchaseForm(true)}>
            <ShoppingCart size={22} />
            ＋ 買い物を記録
            <span style={{ fontWeight: 500, fontSize: 11, opacity: 0.9 }}>買ったものを記録</span>
          </button>
          {!mealTrackingEnabled && (
            <button className="fab orange" onClick={() => setShowAddIngredient(true)}>
              <Plus size={22} />
              ＋ 在庫を追加
              <span style={{ fontWeight: 500, fontSize: 11, opacity: 0.9 }}>在庫に直接追加</span>
            </button>
          )}
        </div>

        {mealTrackingEnabled && (
          <div className="card mb-16">
            <button
              className="section-title"
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                font: 'inherit',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                padding: 0,
                margin: mealsCollapsed ? 0 : '0 0 12px',
              }}
              onClick={() => setMealsCollapsed((v) => !v)}
              aria-expanded={!mealsCollapsed}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>🍴 今日のごはん</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {mealsCollapsed && (
                  <span className="text-muted" style={{ fontSize: 13, fontWeight: 700 }}>
                    {recordedCoreMealCount}/3食 記録済み
                  </span>
                )}
                {mealsCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </span>
            </button>
            {!mealsCollapsed &&
              MEAL_ROWS.map(({ type, icon: Icon }) => (
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
        )}

        {!mealTrackingEnabled && (
          <div className="card mb-16">
            <div className="section-title">🧺 現在の在庫</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>
              {activeIngredientCount}種類
            </div>
            {allExpiring.length > 0 && (
              <>
                <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>
                  期限が近いもの
                </div>
                {allExpiring.slice(0, 3).map(({ ingredient, days }) => {
                  const urgency = expiryUrgency(days);
                  return (
                    <div className="link-row" key={ingredient.id}>
                      <span>
                        {ingredient.name}　{formatQuantity(ingredient.quantity, ingredient.unit)}
                      </span>
                      <span style={expiryUrgencyStyle(urgency)}>
                        {expiryUrgencyIcon(urgency)}
                        {formatExpiryRelative(days)}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
            <button className="btn btn-outline mt-8" onClick={() => navigate('/ingredients')}>
              すべての在庫を見る
            </button>
          </div>
        )}

        <div className="section-title">📅 カレンダー</div>
        <MonthCalendarCard
          ym={ym}
          onPrevMonth={() => setYm((prev) => addMonths(prev, -1))}
          onNextMonth={() => setYm((prev) => addMonths(prev, 1))}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          recordedDates={recordedDates}
          expiryDates={expiryDates}
        />
        <div className="mb-16">
          <DayRecordDetail
            selectedDate={selectedDate}
            meals={meals}
            purchases={purchases}
            cookedDishes={cookedDishes}
            expiringIngredients={dayExpiring}
            mealTrackingEnabled={mealTrackingEnabled}
          />
        </div>

        <div className="card mb-16">
          <div className="section-title">⏰ 期限が近い食材</div>
          {allExpiring.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13 }}>
              期限が設定された食材はありません
            </p>
          ) : (
            <>
              {visibleExpiring.map(({ ingredient, days }) => {
                const urgency = expiryUrgency(days);
                return (
                  <div className="link-row" key={ingredient.id}>
                    <span style={expiryUrgencyStyle(urgency)}>
                      {expiryUrgencyIcon(urgency)}
                      {formatExpiryRelative(days)}
                    </span>
                    <span>
                      {ingredient.name}　{formatQuantity(ingredient.quantity, ingredient.unit)}
                    </span>
                  </div>
                );
              })}
              {allExpiring.length > EXPIRY_LIST_LIMIT && (
                <button
                  className="link-row"
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'none',
                    font: 'inherit',
                    justifyContent: 'center',
                    color: 'var(--color-primary-dark)',
                    fontWeight: 700,
                  }}
                  onClick={() => setShowAllExpiring((v) => !v)}
                >
                  {showAllExpiring ? '閉じる' : `すべて表示（${allExpiring.length}件）`}
                </button>
              )}
            </>
          )}
        </div>

        <div className="card">
          <div className="section-title">
            <ChefHat size={16} /> 調理済み
          </div>
          {cookedStock.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13 }}>
              食べられる調理済み料理はありません
            </p>
          ) : (
            cookedStock.slice(0, 5).map((dish) => (
              <div className="link-row" key={dish.id}>
                <span>{dish.name}</span>
                <span className="text-muted">残り{dish.servingsRemaining}食分</span>
              </div>
            ))
          )}
        </div>
      </div>

      {showMealForm && (
        <MealFormSheet initialMealType={showMealForm} onClose={() => setShowMealForm(null)} />
      )}
      {showPurchaseForm && <PurchaseFormSheet onClose={() => setShowPurchaseForm(false)} />}
      {showAddIngredient && <AddIngredientSheet onClose={() => setShowAddIngredient(false)} />}
      {showNotices && <ExpiryNoticeSheet items={bellExpiring} onClose={() => setShowNotices(false)} />}
    </>
  );
}
