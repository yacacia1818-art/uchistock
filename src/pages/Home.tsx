import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, StickyNote, Utensils, Plus } from 'lucide-react';
import { Header } from '../components/Header';
import { MealFormSheet } from '../components/MealFormSheet';
import { AddIngredientSheet } from '../components/AddIngredientSheet';
import { MemoFormSheet } from '../components/MemoFormSheet';
import { ExpiryNoticeSheet } from '../components/ExpiryNoticeSheet';
import { getSettings } from '../repositories/settingsRepo';
import { listShoppingMemo } from '../repositories/shoppingMemoRepo';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../repositories/notificationRepo';
import { getPeriodCost } from '../services/foodCost';
import { listExpiringIngredients, type ExpiringIngredient } from '../services/expirySummary';
import { syncExpiryNotifications } from '../services/notificationService';
import { getCurrentPeriod } from '../utils/period';
import { expiryUrgency, expiryUrgencyIcon } from '../utils/expiryUi';
import { formatExpiryRelative } from '../utils/expiry';
import { formatDateLabel, todayDateStr } from '../utils/date';
import { categoryEmojiFor } from '../utils/categoryEmoji';
import { useDataVersion } from '../hooks/useDataVersion';
import { useToast } from '../components/ToastProvider';
import { toUserMessage } from '../utils/errors';
import type { AppNotification, MealType, ShoppingMemoItem } from '../types';

export function Home() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const version = useDataVersion();
  const [budget, setBudget] = useState(15000);
  const [used, setUsed] = useState(0);
  const [startDay, setStartDay] = useState(1);
  const [mealTrackingEnabled, setMealTrackingEnabled] = useState(true);
  const [urgent, setUrgent] = useState<ExpiringIngredient[]>([]);
  const [memo, setMemo] = useState<ShoppingMemoItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showMealForm, setShowMealForm] = useState<MealType | null>(null);
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [showAddMemo, setShowAddMemo] = useState(false);
  const [showNotices, setShowNotices] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await syncExpiryNotifications();
        const settings = await getSettings();
        const period = getCurrentPeriod(settings.budgetStartDay);
        const [cost, expiring, memoItems, notifs] = await Promise.all([
          getPeriodCost(period),
          listExpiringIngredients(),
          listShoppingMemo(),
          listNotifications(),
        ]);
        if (cancelled) return;
        setBudget(settings.monthlyBudget);
        setStartDay(settings.budgetStartDay ?? 1);
        setMealTrackingEnabled(settings.mealTrackingEnabled ?? true);
        setUsed(cost.used);
        // 「今日気をつけたいもの」＝期限切れ・今日・3日以内のものだけ。それ以外はホームに出さない
        setUrgent(expiring.filter((e) => e.days <= 3));
        setMemo(memoItems.filter((m) => !m.checked));
        setNotifications(notifs);
      } catch (e) {
        showToast(toUserMessage(e, 'データの読み込みに失敗しました'));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [version, showToast]);

  const periodLabel = startDay === 1 ? '今月の食費' : '今期の食費';
  const remaining = budget - used;

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
        <div className="card mb-16">
          <div className="card-title" style={{ marginBottom: 12 }}>期限のお知らせ</div>
          {urgent.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13 }}>今日は特に気にするものはありません</p>
          ) : (
            (['expired', 'today', 'soon'] as const).map((group) => {
              const items = urgent.filter(({ days }) => expiryUrgency(days) === group);
              if (items.length === 0) return null;
              const groupLabel = group === 'expired' ? '期限切れ' : group === 'today' ? '今日まで' : 'もうすぐ期限';
              return (
                <div key={group} style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: group === 'soon' ? 'var(--color-primary-dark)' : 'var(--color-danger)',
                      margin: '2px 0 4px',
                    }}
                  >
                    {groupLabel}
                  </div>
                  {items.map(({ ingredient, days }) => {
                    const urgency = expiryUrgency(days);
                    return (
                      <div className="item-row" key={ingredient.id}>
                        <div className="item-left">
                          <div className="item-emoji">{categoryEmojiFor(ingredient)}</div>
                          <div className="item-name">
                            <span className="item-name-text">{ingredient.name}</span>
                          </div>
                        </div>
                        <span className={`item-badge${urgency === 'soon' ? ' soon' : ''}`}>
                          {expiryUrgencyIcon(urgency)}
                          {formatExpiryRelative(days)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <button className="card mb-16" style={{ width: '100%', textAlign: 'left', border: 'none', font: 'inherit', cursor: 'pointer' }} onClick={() => navigate('/shopping')}>
          <div className="card-head" style={{ marginBottom: memo.length > 0 ? 6 : 0 }}>
            <div className="card-title">🛒 買い物　{memo.length}件</div>
            <span className="card-link">›</span>
          </div>
          {memo.length > 0 && (
            <div className="text-muted" style={{ fontSize: 12.5 }}>
              {memo.slice(0, 5).map((m) => m.name).join('・')}
            </div>
          )}
        </button>

        <button
          className="card mb-16"
          style={{ width: '100%', textAlign: 'left', border: 'none', font: 'inherit', cursor: 'pointer' }}
          onClick={() => navigate('/food-calendar')}
        >
          <div className="card-head">
            <div className="card-title">{periodLabel}</div>
            <span className="card-link">›</span>
          </div>
          <div className="budget-num display" style={{ fontSize: 24 }}>
            ¥{used.toLocaleString()}
            <span> / ¥{budget.toLocaleString()}</span>
          </div>
          {remaining < 0 && (
            <div style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 700, marginTop: 4 }}>
              予算を¥{Math.abs(remaining).toLocaleString()}超過しています
            </div>
          )}
        </button>
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
              <span className="dot"><StickyNote size={13} /></span>メモ
            </button>
            {mealTrackingEnabled && (
              <button
                className="fab-option"
                onClick={() => {
                  setFabOpen(false);
                  setShowMealForm('朝食');
                }}
              >
                <span className="dot"><Utensils size={13} /></span>食事を記録
              </button>
            )}
            <button
              className="fab-option"
              onClick={() => {
                setFabOpen(false);
                setShowAddIngredient(true);
              }}
            >
              <span className="dot green"><Plus size={13} /></span>追加する
            </button>
          </>
        )}
        <button
          className={`fab-main${fabOpen ? ' open' : ''}`}
          onClick={() => setFabOpen((v) => !v)}
          aria-label={fabOpen ? 'メニューを閉じる' : 'メニューを開く'}
        >
          ＋
        </button>
      </div>

      {showMealForm && (
        <MealFormSheet initialMealType={showMealForm} onClose={() => setShowMealForm(null)} />
      )}
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
