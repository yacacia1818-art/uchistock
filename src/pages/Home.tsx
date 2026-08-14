import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, ChefHat } from 'lucide-react';
import { Header } from '../components/Header';
import { MealFormSheet } from '../components/MealFormSheet';
import { PurchaseFormSheet } from '../components/PurchaseFormSheet';
import { ExpiryNoticeSheet } from '../components/ExpiryNoticeSheet';
import { AddIngredientSheet } from '../components/AddIngredientSheet';
import { MemoFormSheet } from '../components/MemoFormSheet';
import { MonthCalendarCard } from '../components/MonthCalendarCard';
import { DayRecordDetail } from '../components/DayRecordDetail';
import { getSettings } from '../repositories/settingsRepo';
import { listAvailableCookedDishes } from '../repositories/cookedDishRepo';
import { decrementIngredientQuantity, updateIngredient } from '../repositories/ingredientRepo';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../repositories/notificationRepo';
import { getPeriodCost } from '../services/foodCost';
import { listExpiringIngredients, type ExpiringIngredient } from '../services/expirySummary';
import { syncExpiryNotifications } from '../services/notificationService';
import { getCurrentPeriod, formatPeriodRangeLabel, remainingDaysInPeriod } from '../utils/period';
import { expiryUrgency, expiryUrgencyIcon } from '../utils/expiryUi';
import { formatExpiryRelative } from '../utils/expiry';
import { addMonths, currentYearMonth, formatDateLabel, todayDateStr } from '../utils/date';
import { formatStock, gaugeLevelOf, gaugeLevelToQuantity } from '../utils/quantity';
import { categoryEmojiFor } from '../utils/categoryEmoji';
import { notifyDataChanged } from '../utils/bus';
import { useDataVersion } from '../hooks/useDataVersion';
import { useMonthCalendarData } from '../hooks/useMonthCalendarData';
import { useToast } from '../components/ToastProvider';
import { toUserMessage } from '../utils/errors';
import type { AppNotification, Ingredient, MealType } from '../types';

export function Home() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const version = useDataVersion();
  const [budget, setBudget] = useState(15000);
  const [used, setUsed] = useState(0);
  const [startDay, setStartDay] = useState(1);
  const [mealTrackingEnabled, setMealTrackingEnabled] = useState(true);
  const [cookedStock, setCookedStock] = useState<
    Awaited<ReturnType<typeof listAvailableCookedDishes>>
  >([]);
  const [allExpiring, setAllExpiring] = useState<ExpiringIngredient[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showMealForm, setShowMealForm] = useState<MealType | null>(null);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [showAddMemo, setShowAddMemo] = useState(false);
  const [showNotices, setShowNotices] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [ym, setYm] = useState(currentYearMonth());
  const [selectedDate, setSelectedDate] = useState(todayDateStr());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await syncExpiryNotifications();
        const settings = await getSettings();
        const period = getCurrentPeriod(settings.budgetStartDay);
        const [cost, expiring, dishes, notifs] = await Promise.all([
          getPeriodCost(period),
          listExpiringIngredients(),
          listAvailableCookedDishes(),
          listNotifications(),
        ]);
        if (cancelled) return;
        setBudget(settings.monthlyBudget);
        setStartDay(settings.budgetStartDay ?? 1);
        setMealTrackingEnabled(settings.mealTrackingEnabled ?? true);
        setUsed(cost.used);
        setAllExpiring(expiring);
        setNotifications(notifs);
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

  const period = getCurrentPeriod(startDay);
  const periodLabel = startDay === 1 ? '今月の食費' : '今期の食費';
  const remaining = budget - used;
  const progress = budget > 0 ? Math.min(100, Math.round((used / budget) * 100)) : 0;
  const perDay = Math.max(0, Math.floor(remaining / remainingDaysInPeriod(period)));

  const stockedIngredients = ingredients.filter((i) => i.quantity > 0);
  const foodCount = stockedIngredients.filter((i) => (i.itemType ?? '食品') === '食品').length;
  const householdCount = stockedIngredients.filter((i) => i.itemType === '日用品').length;
  const topExpiring = allExpiring.slice(0, 3);
  const expiredCount = allExpiring.filter((e) => e.days < 0).length;
  const todayCount = allExpiring.filter((e) => e.days === 0).length;
  const alertParts = [
    expiredCount > 0 ? `期限切れ${expiredCount}件` : null,
    todayCount > 0 ? `今日まで${todayCount}件` : null,
  ].filter((s): s is string => s !== null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function handleMarkNotificationRead(id: string) {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (e) {
      showToast(toUserMessage(e, '更新に失敗しました'));
    }
  }

  async function handleMarkAllNotificationsRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      showToast(toUserMessage(e, '更新に失敗しました'));
    }
  }

  async function stepCount(ingredient: Ingredient, delta: 1 | -1) {
    try {
      if (delta < 0) {
        // 期限バッチもFIFOで一緒に減らす
        await decrementIngredientQuantity(ingredient.id, 1);
      } else {
        await updateIngredient({ ...ingredient, quantity: Math.round((ingredient.quantity + 1) * 10) / 10 });
      }
      notifyDataChanged();
    } catch (e) {
      showToast(toUserMessage(e, '更新に失敗しました'));
    }
  }

  async function stepGauge(ingredient: Ingredient, delta: 1 | -1) {
    try {
      const nextLevel = Math.max(0, Math.min(10, gaugeLevelOf(ingredient) + delta));
      const nextQuantity = gaugeLevelToQuantity(nextLevel);
      if (nextQuantity < ingredient.quantity) {
        await decrementIngredientQuantity(ingredient.id, ingredient.quantity - nextQuantity);
      } else {
        await updateIngredient({ ...ingredient, quantity: nextQuantity });
      }
      notifyDataChanged();
    } catch (e) {
      showToast(toUserMessage(e, '更新に失敗しました'));
    }
  }

  return (
    <>
      <Header
        icon={<div className="header-icon-box">📦</div>}
        title="ウチストック"
        subtitle={formatDateLabel(todayDateStr())}
        actions={
          <button
            className="icon-btn"
            aria-label="お知らせ"
            style={{ position: 'relative', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
            onClick={() => setShowNotices(true)}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  minWidth: 16,
                  height: 16,
                  padding: '0 3px',
                  borderRadius: 999,
                  background: 'var(--color-danger)',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>
        }
      />
      <div className="page-content">
        {alertParts.length > 0 && (
          <button className="alert-chip" onClick={() => setShowNotices(true)}>
            <span>⚠️ {alertParts.join('・')}</span>
            <span>›</span>
          </button>
        )}

        <div className="card mb-16">
          <div className="card-head">
            <div className="card-title">🧺 在庫</div>
            <button className="card-link" onClick={() => navigate('/ingredients')}>
              すべて見る ›
            </button>
          </div>
          <div className="stock-meta">
            食品 <b>{foodCount}</b>品　日用品 <b>{householdCount}</b>品
          </div>
          {topExpiring.length > 0 ? (
            <>
              <div className="sort-label">期限が近い順</div>
              {topExpiring.map(({ ingredient, days }) => {
                const urgency = expiryUrgency(days);
                return (
                  <div className="item-row" key={ingredient.id}>
                    <div className="item-left">
                      <div className="item-emoji">{categoryEmojiFor(ingredient)}</div>
                      <div className="item-name">
                        <span className="item-name-text">{ingredient.name}</span>
                        <span className={`item-badge${urgency === 'soon' ? ' soon' : ''}`}>
                          {expiryUrgencyIcon(urgency)}
                          {formatExpiryRelative(days)}
                        </span>
                      </div>
                    </div>
                    {ingredient.quantityMode === 'gauge' ? (
                      <div className="gauge-control">
                        <button
                          className="gauge-arrow"
                          onClick={() => stepGauge(ingredient, -1)}
                          aria-label="減らす"
                          disabled={gaugeLevelOf(ingredient) <= 0}
                        >
                          ▾
                        </button>
                        <div className="gauge-track">
                          <div className="gauge-fill" style={{ width: `${gaugeLevelOf(ingredient) * 10}%` }} />
                        </div>
                        <button
                          className="gauge-arrow"
                          onClick={() => stepGauge(ingredient, 1)}
                          aria-label="増やす"
                          disabled={gaugeLevelOf(ingredient) >= 10}
                        >
                          ▴
                        </button>
                      </div>
                    ) : (
                      <div className="count-control">
                        <button className="count-btn" onClick={() => stepCount(ingredient, -1)} aria-label="減らす">
                          −
                        </button>
                        <span className="count-num">{formatStock(ingredient)}</span>
                        <button className="count-btn" onClick={() => stepCount(ingredient, 1)} aria-label="増やす">
                          ＋
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <p className="text-muted" style={{ fontSize: 13 }}>
              期限が近いものはありません
            </p>
          )}
        </div>

        <div className="card mb-16">
          <div className="card-head">
            <div className="card-title">🧾 {periodLabel}</div>
            <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', fontWeight: 700 }}>
              予算 ¥{budget.toLocaleString()}
            </div>
          </div>
          <div className="text-muted" style={{ fontSize: 12 }}>
            {formatPeriodRangeLabel(period)}
          </div>
          <div className="budget-num display">
            ¥{used.toLocaleString()}
            <span> / ¥{budget.toLocaleString()}</span>
          </div>
          <div className="budget-bar-track">
            <div className="budget-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="budget-foot">
            <span>
              残り{' '}
              <b style={remaining < 0 ? { color: 'var(--color-danger)' } : undefined}>
                ¥{remaining.toLocaleString()}
              </b>
            </span>
            {remaining >= 0 && (
              <span>
                1日あたり目安 <b>¥{perDay.toLocaleString()}</b>
              </span>
            )}
          </div>
        </div>

        <div className="card mb-16">
          <div className="card-title" style={{ marginBottom: 12 }}>
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title" style={{ marginBottom: 0 }}>
            📅 カレンダー
          </div>
          <button className="btn-ghost btn btn-sm" onClick={() => navigate('/calendar')}>
            詳しく見る <ChevronRight size={14} />
          </button>
        </div>
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
      </div>

      {fabOpen && <button className="fab-backdrop" aria-label="閉じる" onClick={() => setFabOpen(false)} />}
      <div className="fab-zone">
        {fabOpen && (
          <>
            <button
              className="fab-option"
              onClick={() => {
                setFabOpen(false);
                setShowAddMemo(true);
              }}
            >
              <span className="dot">📝</span>メモ
            </button>
            <button
              className="fab-option"
              onClick={() => {
                setFabOpen(false);
                setShowAddIngredient(true);
              }}
            >
              <span className="dot">➕</span>在庫に追加
            </button>
            <button
              className="fab-option"
              onClick={() => {
                setFabOpen(false);
                setShowPurchaseForm(true);
              }}
            >
              <span className="dot green">🛒</span>買い物を記録
            </button>
            {mealTrackingEnabled && (
              <button
                className="fab-option"
                onClick={() => {
                  setFabOpen(false);
                  setShowMealForm('朝食');
                }}
              >
                <span className="dot">🍽️</span>食事を記録
              </button>
            )}
          </>
        )}
        <button
          className={`fab-main${fabOpen ? ' open' : ''}`}
          onClick={() => setFabOpen((v) => !v)}
          aria-label={fabOpen ? '記録メニューを閉じる' : '記録メニューを開く'}
        >
          ＋
        </button>
      </div>

      {showMealForm && (
        <MealFormSheet initialMealType={showMealForm} onClose={() => setShowMealForm(null)} />
      )}
      {showPurchaseForm && <PurchaseFormSheet onClose={() => setShowPurchaseForm(false)} />}
      {showAddIngredient && <AddIngredientSheet onClose={() => setShowAddIngredient(false)} />}
      {showAddMemo && <MemoFormSheet onClose={() => setShowAddMemo(false)} />}
      {showNotices && (
        <ExpiryNoticeSheet
          notifications={notifications}
          onMarkRead={handleMarkNotificationRead}
          onMarkAllRead={handleMarkAllNotificationsRead}
          onClose={() => setShowNotices(false)}
        />
      )}
    </>
  );
}
