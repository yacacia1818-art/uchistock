import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, StickyNote, Utensils, Plus } from 'lucide-react';
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
import { formatDateLabel, todayDateStr } from '../utils/date';
import { categoryEmojiFor } from '../utils/categoryEmoji';
import { useDataVersion } from '../hooks/useDataVersion';
import { useToast } from '../components/ToastProvider';
import { toUserMessage } from '../utils/errors';
import type { AppNotification, MealType, ShoppingMemoItem } from '../types';

interface ExpiryGroup {
  key: string;
  label: string;
  tone: 'urgent' | 'warn';
  items: ExpiringIngredient[];
}

// 期限切れ・今日までは状態そのものが緊急度を表すので専用の見出しにし、
// それ以外は「あと◯日」という数字そのものが意味を伝えるので日数ごとに分ける
function buildExpiryGroups(urgent: ExpiringIngredient[]): ExpiryGroup[] {
  const groups: ExpiryGroup[] = [];
  const expired = urgent.filter((u) => u.days < 0);
  const today = urgent.filter((u) => u.days === 0);
  if (expired.length > 0) groups.push({ key: 'expired', label: '期限切れ', tone: 'urgent', items: expired });
  if (today.length > 0) groups.push({ key: 'today', label: '今日まで', tone: 'urgent', items: today });
  for (let d = 1; d <= 3; d++) {
    const items = urgent.filter((u) => u.days === d);
    if (items.length > 0) groups.push({ key: `d${d}`, label: `あと${d}日`, tone: 'warn', items });
  }
  return groups;
}

export function Home() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const version = useDataVersion();
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
        setStartDay(settings.budgetStartDay ?? 1);
        setMealTrackingEnabled(settings.mealTrackingEnabled ?? true);
        setUsed(cost.used);
        // ホームで気にすべきもの＝期限切れ・今日・3日以内のものだけ。それ以外は出さない
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
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const expiryGroups = useMemo(() => buildExpiryGroups(urgent), [urgent]);

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
      />
      <div className="page-content" style={{ paddingBottom: 'calc(var(--nav-height) + 86px + var(--safe-bottom))' }}>
        <div className="card expiry-hero mb-16">
          <div className="card-head expiry-hero-title">
            <div className="card-title display">期限のお知らせ</div>
            {unreadCount > 0 && (
              <button className="btn btn-outline btn-sm" onClick={() => setShowNotices(true)}>
                <Check size={13} /> {unreadCount}件を確認
              </button>
            )}
          </div>

          {expiryGroups.length === 0 ? (
            <div className="expiry-empty">
              <div className="check-badge">
                <Check size={20} strokeWidth={3} />
              </div>
              <div className="main-msg">今日は気になる期限はありません</div>
              <div className="sub-msg">ひとまず安心です</div>
            </div>
          ) : (
            expiryGroups.map((group) => (
              <div className="expiry-group" key={group.key}>
                <div className={`expiry-group-label ${group.tone}`}>
                  <span className="dot" />
                  {group.label}
                </div>
                {group.items.map(({ ingredient }) => (
                  <div className="expiry-item" key={ingredient.id}>
                    <div className="item-emoji">{categoryEmojiFor(ingredient)}</div>
                    <span className="expiry-item-name">{ingredient.name}</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <button className="quick-row mb-8" onClick={() => navigate('/shopping')}>
          <span className="quick-row-label">🛒 買い物メモ</span>
          <span className="quick-row-right">
            <span className="quick-row-value">{memo.length}件</span>
            <span className="card-link">›</span>
          </span>
        </button>

        <button className="quick-row" onClick={() => navigate('/food-calendar')}>
          <span className="quick-row-label">{periodLabel}</span>
          <span className="quick-row-right">
            <span className="quick-row-value">¥{used.toLocaleString()}</span>
            <span className="card-link">›</span>
          </span>
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
          className={`fab-main small${fabOpen ? ' open' : ''}`}
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
