import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Plus, Sun, Moon, Cookie, ShoppingCart } from 'lucide-react';
import { Header } from '../components/Header';
import { MealFormSheet } from '../components/MealFormSheet';
import { CookingFormSheet } from '../components/CookingFormSheet';
import { PurchaseFormSheet } from '../components/PurchaseFormSheet';
import { MealDetailSheet } from '../components/MealDetailSheet';
import { CookingDetailSheet } from '../components/CookingDetailSheet';
import { RecordTypeChooserSheet, type RecordChoice } from '../components/RecordTypeChooserSheet';
import { listMeals } from '../repositories/mealRepo';
import { listCookedDishes } from '../repositories/cookedDishRepo';
import { listPurchases } from '../repositories/purchaseRepo';
import { getSettings } from '../repositories/settingsRepo';
import { getPeriodCost } from '../services/foodCost';
import { getCurrentPeriod } from '../utils/period';
import { useDataVersion } from '../hooks/useDataVersion';
import { useToast } from '../components/ToastProvider';
import { toUserMessage } from '../utils/errors';
import { formatDateLabel } from '../utils/date';
import { formatQuantity } from '../utils/quantity';
import { mealContentLabel, mealSubLabel } from '../utils/mealDisplay';
import type { CookedDish, Meal, Purchase } from '../types';

const MEAL_ICON = { 朝食: Sun, 昼食: Sun, 夕食: Moon, 間食: Cookie } as const;
const RECENT_LIMIT = 5;
const FREQUENT_LIMIT = 6;

type RecordsTab = 'meals' | 'cooking';

type RecentItem =
  | { kind: 'purchase'; key: string; date: string; time: string; purchase: Purchase }
  | { kind: 'meal'; key: string; date: string; time: string; meal: Meal }
  | { kind: 'cooking'; key: string; date: string; time: string; dish: CookedDish };

export function Records() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const version = useDataVersion();
  const [tab, setTab] = useState<RecordsTab>('meals');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [cookedDishes, setCookedDishes] = useState<CookedDish[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [mealTrackingEnabled, setMealTrackingEnabled] = useState(true);
  const [periodLabel, setPeriodLabel] = useState('今月の食費');
  const [used, setUsed] = useState(0);
  const [budget, setBudget] = useState(15000);
  const [showChooser, setShowChooser] = useState(false);
  const [showMealForm, setShowMealForm] = useState(false);
  const [showCookingForm, setShowCookingForm] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [selectedDish, setSelectedDish] = useState<CookedDish | null>(null);
  const [editingDish, setEditingDish] = useState<CookedDish | null>(null);

  useEffect(() => {
    Promise.all([listMeals(), listCookedDishes(), listPurchases(), getSettings()])
      .then(([m, c, p, s]) => {
        setMeals(m);
        setCookedDishes(c);
        setPurchases(p);
        const enabled = s.mealTrackingEnabled ?? true;
        setMealTrackingEnabled(enabled);
        setTab((prev) => (!enabled && prev === 'meals' ? 'cooking' : prev));
        setBudget(s.monthlyBudget);
        setPeriodLabel((s.budgetStartDay ?? 1) === 1 ? '今月の食費' : '今期の食費');
        const period = getCurrentPeriod(s.budgetStartDay);
        getPeriodCost(period)
          .then((cost) => setUsed(cost.used))
          .catch((e) => showToast(toUserMessage(e, 'データの読み込みに失敗しました')));
      })
      .catch((e) => showToast(toUserMessage(e, 'データの読み込みに失敗しました')));
  }, [version, showToast]);

  function handleChoose(choice: RecordChoice) {
    setShowChooser(false);
    if (choice === 'meal') setShowMealForm(true);
    else if (choice === 'cooking') setShowCookingForm(true);
    else setShowPurchaseForm(true);
  }

  // 購入・食事・調理をひとつの時系列にまとめ、直近だけを見せる（大量の履歴は並べない）
  const recentItems = useMemo<RecentItem[]>(() => {
    const items: RecentItem[] = [
      ...purchases.map((p) => ({ kind: 'purchase' as const, key: `p-${p.id}`, date: p.date, time: p.time, purchase: p })),
      ...meals.map((m) => ({ kind: 'meal' as const, key: `m-${m.id}`, date: m.date, time: m.time, meal: m })),
      ...cookedDishes.map((d) => ({ kind: 'cooking' as const, key: `c-${d.id}`, date: d.date, time: d.time, dish: d })),
    ];
    items.sort((a, b) => (a.date === b.date ? b.time.localeCompare(a.time) : b.date.localeCompare(a.date)));
    return items.slice(0, RECENT_LIMIT);
  }, [purchases, meals, cookedDishes]);

  // 過去の購入商品から「よく買うもの」を集計する（将来的に在庫追加・買い物メモ候補にも使える想定）
  const frequentItems = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of purchases) {
      for (const item of p.items ?? []) {
        counts.set(item.name, (counts.get(item.name) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, FREQUENT_LIMIT);
  }, [purchases]);

  function handleRecentClick(item: RecentItem) {
    if (item.kind === 'purchase') navigate('/food-calendar');
    else if (item.kind === 'meal') setSelectedMeal(item.meal);
    else setSelectedDish(item.dish);
  }

  return (
    <>
      <Header
        icon={<History size={20} />}
        title="履歴"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowChooser(true)}>
            <Plus size={16} /> 記録
          </button>
        }
      />
      <div className="page-content">
        <button
          className="card mb-16"
          style={{ width: '100%', textAlign: 'left', border: 'none', font: 'inherit', cursor: 'pointer' }}
          onClick={() => navigate('/food-calendar')}
        >
          <div className="card-head">
            <div className="card-title">{periodLabel}</div>
            <span className="card-link">›</span>
          </div>
          <div className="budget-num display" style={{ fontSize: 22 }}>
            ¥{used.toLocaleString()}
            <span> / ¥{budget.toLocaleString()}</span>
          </div>
        </button>

        <div className="card mb-16">
          <div className="section-title">最近の記録</div>
          {recentItems.length === 0 ? (
            <div className="empty-state">まだ記録がありません</div>
          ) : (
            recentItems.map((item) => {
              if (item.kind === 'purchase') {
                return (
                  <button
                    key={item.key}
                    className="list-row"
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', font: 'inherit' }}
                    onClick={() => handleRecentClick(item)}
                  >
                    <div className="row-emoji">
                      <ShoppingCart size={18} />
                    </div>
                    <div className="row-main">
                      <div className="row-title">¥{item.purchase.totalAmount.toLocaleString()}</div>
                      <div className="row-sub">
                        {formatDateLabel(item.date)}
                        {item.purchase.storeName && ` ・ ${item.purchase.storeName}`}
                      </div>
                    </div>
                  </button>
                );
              }
              if (item.kind === 'meal') {
                const Icon = MEAL_ICON[item.meal.mealType];
                const sub = mealSubLabel(item.meal);
                return (
                  <button
                    key={item.key}
                    className="list-row"
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', font: 'inherit' }}
                    onClick={() => handleRecentClick(item)}
                  >
                    <div className="row-emoji">
                      <Icon size={18} />
                    </div>
                    <div className="row-main">
                      <div className="row-title">{mealContentLabel(item.meal)}</div>
                      <div className="row-sub">
                        {formatDateLabel(item.date)} ・ {item.meal.mealType}
                        {sub && ` ・ ${sub}`}
                      </div>
                    </div>
                  </button>
                );
              }
              return (
                <button
                  key={item.key}
                  className="list-row"
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', font: 'inherit' }}
                  onClick={() => handleRecentClick(item)}
                >
                  <div className="row-emoji">🍳</div>
                  <div className="row-main">
                    <div className="row-title">{item.dish.name}</div>
                    <div className="row-sub">{formatDateLabel(item.date)}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {frequentItems.length > 0 && (
          <div className="card mb-16">
            <div className="section-title">よく買うもの</div>
            <div className="chip-row">
              {frequentItems.map(([name, count]) => (
                <span key={name} className="chip">
                  {name}　×{count}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="tabs">
          {mealTrackingEnabled && (
            <button className={`tab${tab === 'meals' ? ' active' : ''}`} onClick={() => setTab('meals')}>
              食事
            </button>
          )}
          <button className={`tab${tab === 'cooking' ? ' active' : ''}`} onClick={() => setTab('cooking')}>
            調理
          </button>
        </div>

        {tab === 'meals' && mealTrackingEnabled && (
          <div className="card">
            {meals.length === 0 ? (
              <div className="empty-state">まだ食事記録がありません</div>
            ) : (
              meals.map((m) => {
                const Icon = MEAL_ICON[m.mealType];
                const sub = mealSubLabel(m);
                return (
                  <button
                    key={m.id}
                    className="list-row"
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', font: 'inherit' }}
                    onClick={() => setSelectedMeal(m)}
                  >
                    <div className="row-emoji">
                      <Icon size={18} />
                    </div>
                    <div className="row-main">
                      <div className="row-title">{mealContentLabel(m)}</div>
                      <div className="row-sub">
                        {formatDateLabel(m.date)} ・ {m.mealType}
                        {sub && ` ・ ${sub}`}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {tab === 'cooking' && (
          <div className="card">
            {cookedDishes.length === 0 ? (
              <div className="empty-state">まだ調理記録がありません</div>
            ) : (
              cookedDishes.map((dish) => (
                <button
                  key={dish.id}
                  className="list-row"
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    font: 'inherit',
                    alignItems: 'flex-start',
                  }}
                  onClick={() => setSelectedDish(dish)}
                >
                  <div className="row-emoji">🍳</div>
                  <div className="row-main">
                    <div className="row-title">{dish.name}</div>
                    <div className="row-sub">
                      {formatDateLabel(dish.date)} {dish.time}
                    </div>
                    {dish.ingredientUsages.length > 0 && (
                      <div className="row-sub mt-8">
                        使用食材：
                        {dish.ingredientUsages
                          .map((u) => `${u.ingredientName} ${formatQuantity(u.usage.value, u.unit)}`)
                          .join('・')}
                      </div>
                    )}
                    {dish.servings !== undefined && (
                      <div className="row-sub">
                        完成量：{dish.servings}食分
                        {dish.servingsRemaining !== undefined && `（残り${dish.servingsRemaining}食）`}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {showChooser && (
        <RecordTypeChooserSheet
          onClose={() => setShowChooser(false)}
          onChoose={handleChoose}
          mealTrackingEnabled={mealTrackingEnabled}
        />
      )}
      {showMealForm && mealTrackingEnabled && <MealFormSheet onClose={() => setShowMealForm(false)} />}
      {showCookingForm && <CookingFormSheet onClose={() => setShowCookingForm(false)} />}
      {showPurchaseForm && <PurchaseFormSheet onClose={() => setShowPurchaseForm(false)} />}

      {selectedMeal && (
        <MealDetailSheet
          meal={selectedMeal}
          onClose={() => setSelectedMeal(null)}
          onEdit={() => {
            setEditingMeal(selectedMeal);
            setSelectedMeal(null);
          }}
        />
      )}
      {editingMeal && (
        <MealFormSheet key={editingMeal.id} editingMeal={editingMeal} onClose={() => setEditingMeal(null)} />
      )}

      {selectedDish && (
        <CookingDetailSheet
          dish={selectedDish}
          onClose={() => setSelectedDish(null)}
          onEdit={() => {
            setEditingDish(selectedDish);
            setSelectedDish(null);
          }}
        />
      )}
      {editingDish && (
        <CookingFormSheet key={editingDish.id} editingDish={editingDish} onClose={() => setEditingDish(null)} />
      )}
    </>
  );
}
