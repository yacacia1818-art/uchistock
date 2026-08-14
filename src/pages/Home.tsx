import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils, ShoppingCart, Bell, ChevronRight, Plus, ChefHat, StickyNote } from 'lucide-react';
import { Header } from '../components/Header';
import { MealFormSheet } from '../components/MealFormSheet';
import { PurchaseFormSheet } from '../components/PurchaseFormSheet';
import { ExpiryNoticeSheet } from '../components/ExpiryNoticeSheet';
import { AddIngredientSheet } from '../components/AddIngredientSheet';
import { MemoFormSheet } from '../components/MemoFormSheet';
import { MonthCalendarCard } from '../components/MonthCalendarCard';
import { DayRecordDetail } from '../components/DayRecordDetail';
import { BottomSheet } from '../components/BottomSheet';
import { GaugeControl } from '../components/GaugeControl';
import { getSettings } from '../repositories/settingsRepo';
import { listAvailableCookedDishes } from '../repositories/cookedDishRepo';
import { decrementIngredientQuantity } from '../repositories/ingredientRepo';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../repositories/notificationRepo';
import { getPeriodCost } from '../services/foodCost';
import { listExpiringIngredients, type ExpiringIngredient } from '../services/expirySummary';
import { syncExpiryNotifications } from '../services/notificationService';
import { getCurrentPeriod, formatPeriodRangeLabel, remainingDaysInPeriod } from '../utils/period';
import { expiryUrgency, expiryUrgencyIcon, expiryUrgencyStyle } from '../utils/expiryUi';
import { addMonths, currentYearMonth, formatDateLabel, todayDateStr } from '../utils/date';
import { formatStock, gaugeLevelOf, gaugeLevelToQuantity } from '../utils/quantity';
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
  const [gaugeTarget, setGaugeTarget] = useState<Ingredient | null>(null);
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

  function handleQuickUse(ingredient: Ingredient) {
    if (ingredient.quantityMode === 'gauge') {
      // ゲージ管理はワンタップで即減算せず、軽量なポップオーバーで量を選んでから確定させる
      setGaugeTarget(ingredient);
      return;
    }
    decrementIngredientQuantity(ingredient.id, 1)
      .then(() => {
        notifyDataChanged();
        showToast(`${ingredient.name}を使いました`);
      })
      .catch((e) => showToast(toUserMessage(e, '更新に失敗しました')));
  }

  async function handleGaugeTargetChange(nextLevel: number) {
    if (!gaugeTarget) return;
    try {
      const nextQuantity = gaugeLevelToQuantity(nextLevel);
      if (nextQuantity < gaugeTarget.quantity) {
        await decrementIngredientQuantity(gaugeTarget.id, gaugeTarget.quantity - nextQuantity);
      }
      notifyDataChanged();
      setGaugeTarget({ ...gaugeTarget, quantity: nextQuantity });
    } catch (e) {
      showToast(toUserMessage(e, '更新に失敗しました'));
    }
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
            {unreadCount > 0 && (
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
                {unreadCount}
              </span>
            )}
          </button>
        }
      />
      <div className="page-content">
        {alertParts.length > 0 && (
          <button
            className="card mb-16"
            onClick={() => setShowNotices(true)}
            style={{
              width: '100%',
              textAlign: 'left',
              border: 'none',
              cursor: 'pointer',
              background: 'var(--color-danger)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              font: 'inherit',
            }}
          >
            <span style={{ fontWeight: 700 }}>⚠ {alertParts.join('・')}</span>
            <ChevronRight size={16} />
          </button>
        )}

        <div className="card mb-16">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>
              🧺 在庫
            </div>
            <button className="btn-ghost btn btn-sm" onClick={() => navigate('/ingredients')}>
              すべて見る <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>
            <span>食品 {foodCount}品</span>
            <span>日用品 {householdCount}品</span>
          </div>
          {topExpiring.length > 0 ? (
            <>
              <div className="text-muted" style={{ fontSize: 11, marginBottom: 4 }}>
                期限が近い順
              </div>
              {topExpiring.map(({ ingredient, days }) => {
              const urgency = expiryUrgency(days);
              return (
                <div className="link-row" key={ingredient.id}>
                  <span style={expiryUrgencyStyle(urgency)}>
                    {expiryUrgencyIcon(urgency)}
                    {ingredient.name}　{formatStock(ingredient)}
                  </span>
                  <button className="btn btn-outline btn-sm" onClick={() => handleQuickUse(ingredient)}>
                    使った
                  </button>
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
          <button className="fab soft" onClick={() => setShowAddIngredient(true)}>
            <Plus size={22} />
            ＋ 在庫に追加
            <span style={{ fontWeight: 500, fontSize: 11, opacity: 0.9 }}>貰い物など、金額を記録しない場合</span>
          </button>
          <button className="fab outline" onClick={() => setShowAddMemo(true)}>
            <StickyNote size={22} />
            ＋ メモ
            <span style={{ fontWeight: 500, fontSize: 11, opacity: 0.9 }}>思いついたことを書く</span>
          </button>
        </div>

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

        <div className="card mb-16">
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

      {showMealForm && (
        <MealFormSheet initialMealType={showMealForm} onClose={() => setShowMealForm(null)} />
      )}
      {showPurchaseForm && <PurchaseFormSheet onClose={() => setShowPurchaseForm(false)} />}
      {showAddIngredient && <AddIngredientSheet onClose={() => setShowAddIngredient(false)} />}
      {showAddMemo && <MemoFormSheet onClose={() => setShowAddMemo(false)} />}
      {gaugeTarget && (
        <BottomSheet title={`${gaugeTarget.name}を使った`} onClose={() => setGaugeTarget(null)}>
          <div className="field">
            <label>残量</label>
            <GaugeControl level={gaugeLevelOf(gaugeTarget)} onChange={handleGaugeTargetChange} />
          </div>
          <button className="btn btn-primary" onClick={() => setGaugeTarget(null)}>
            完了
          </button>
        </BottomSheet>
      )}
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
