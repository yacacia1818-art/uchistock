import { useEffect, useState } from 'react';
import { ClipboardList, Image as ImageIcon, Pencil, Plus, Sun, Moon, Cookie } from 'lucide-react';
import { Header } from '../components/Header';
import { BottomSheet } from '../components/BottomSheet';
import { ShoppingMemoPanel } from '../components/ShoppingMemoPanel';
import { MealFormSheet } from '../components/MealFormSheet';
import { CookingFormSheet } from '../components/CookingFormSheet';
import { PurchaseFormSheet } from '../components/PurchaseFormSheet';
import { PurchaseEditSheet } from '../components/PurchaseEditSheet';
import { MealDetailSheet } from '../components/MealDetailSheet';
import { CookingDetailSheet } from '../components/CookingDetailSheet';
import { ReceiptViewer } from '../components/ReceiptViewer';
import { RecordTypeChooserSheet, type RecordChoice } from '../components/RecordTypeChooserSheet';
import { listMeals } from '../repositories/mealRepo';
import { listPurchases } from '../repositories/purchaseRepo';
import { listCookedDishes } from '../repositories/cookedDishRepo';
import { getSettings } from '../repositories/settingsRepo';
import { useDataVersion } from '../hooks/useDataVersion';
import { useToast } from '../components/ToastProvider';
import { toUserMessage } from '../utils/errors';
import { formatDateLabel } from '../utils/date';
import { formatQuantity } from '../utils/quantity';
import { mealContentLabel, mealSubLabel } from '../utils/mealDisplay';
import type { CookedDish, Meal, Purchase } from '../types';

const MEAL_ICON = { 朝食: Sun, 昼食: Sun, 夕食: Moon, 間食: Cookie } as const;

type RecordsTab = 'shopping' | 'meals' | 'cooking' | 'purchases';

export function Records() {
  const { showToast } = useToast();
  const version = useDataVersion();
  const [tab, setTab] = useState<RecordsTab>('shopping');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [cookedDishes, setCookedDishes] = useState<CookedDish[]>([]);
  const [mealTrackingEnabled, setMealTrackingEnabled] = useState(true);
  const [showChooser, setShowChooser] = useState(false);
  const [showMealForm, setShowMealForm] = useState(false);
  const [showCookingForm, setShowCookingForm] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [selectedDish, setSelectedDish] = useState<CookedDish | null>(null);
  const [editingDish, setEditingDish] = useState<CookedDish | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listMeals(), listPurchases(), listCookedDishes(), getSettings()])
      .then(([m, p, c, s]) => {
        setMeals(m);
        setPurchases(p);
        setCookedDishes(c);
        const enabled = s.mealTrackingEnabled ?? true;
        setMealTrackingEnabled(enabled);
        setTab((prev) => (!enabled && prev === 'meals' ? 'cooking' : prev));
      })
      .catch((e) => showToast(toUserMessage(e, 'データの読み込みに失敗しました')));
  }, [version, showToast]);

  function handleChoose(choice: RecordChoice) {
    setShowChooser(false);
    if (choice === 'meal') setShowMealForm(true);
    else if (choice === 'cooking') setShowCookingForm(true);
    else setShowPurchaseForm(true);
  }

  return (
    <>
      <Header
        icon={<ClipboardList size={20} />}
        title="記録"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowChooser(true)}>
            <Plus size={16} /> 記録
          </button>
        }
      />
      <div className="page-content">
        <div className="tabs">
          <button className={`tab${tab === 'shopping' ? ' active' : ''}`} onClick={() => setTab('shopping')}>
            買い物
          </button>
          {mealTrackingEnabled && (
            <button className={`tab${tab === 'meals' ? ' active' : ''}`} onClick={() => setTab('meals')}>
              食事
            </button>
          )}
          <button className={`tab${tab === 'cooking' ? ' active' : ''}`} onClick={() => setTab('cooking')}>
            調理
          </button>
          <button className={`tab${tab === 'purchases' ? ' active' : ''}`} onClick={() => setTab('purchases')}>
            購入
          </button>
        </div>

        {tab === 'shopping' && <ShoppingMemoPanel />}

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

        {tab === 'purchases' && (
          <div className="card">
            {purchases.length === 0 ? (
              <div className="empty-state">まだ購入履歴がありません</div>
            ) : (
              purchases.map((p) => (
                <button
                  key={p.id}
                  className="list-row"
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', font: 'inherit' }}
                  onClick={() => setSelectedPurchase(p)}
                >
                  <div className="row-emoji">🛒</div>
                  <div className="row-main">
                    <div className="row-title">¥{p.totalAmount.toLocaleString()}</div>
                    <div className="row-sub">
                      {formatDateLabel(p.date)}
                      {p.storeName && ` ・ ${p.storeName}`}
                      {p.receiptId && ' ・ レシート有'}
                    </div>
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

      {selectedPurchase && (
        <BottomSheet
          title="購入詳細"
          onClose={() => setSelectedPurchase(null)}
        >
          <button
            className="btn btn-outline mb-16"
            onClick={() => {
              setEditingPurchase(selectedPurchase);
              setSelectedPurchase(null);
            }}
          >
            <Pencil size={16} /> 編集
          </button>
          <div className="field">
            <label>日付</label>
            <div>{formatDateLabel(selectedPurchase.date)} {selectedPurchase.time}</div>
          </div>
          <div className="field">
            <label>合計金額</label>
            <div style={{ fontSize: 22, fontWeight: 800 }}>¥{selectedPurchase.totalAmount.toLocaleString()}</div>
          </div>
          {selectedPurchase.foodAmount !== undefined && selectedPurchase.foodAmount !== selectedPurchase.totalAmount && (
            <div className="field">
              <label>食費として計上した金額</label>
              <div>¥{selectedPurchase.foodAmount.toLocaleString()}</div>
            </div>
          )}
          {selectedPurchase.storeName && (
            <div className="field">
              <label>店名</label>
              <div>{selectedPurchase.storeName}</div>
            </div>
          )}
          {selectedPurchase.items && selectedPurchase.items.length > 0 && (
            <div className="field">
              <label>購入商品</label>
              <div className="card" style={{ padding: '4px 12px' }}>
                {selectedPurchase.items.map((item, idx) => (
                  <div className="list-row" key={idx} style={{ alignItems: 'flex-start' }}>
                    <div className="row-emoji">{item.category === '日用品' ? '🧻' : '🛒'}</div>
                    <div className="row-main">
                      <div className="row-title">{item.name}</div>
                      <div className="row-sub">
                        {[
                          item.quantity !== undefined && item.unit ? `${item.quantity}${item.unit}` : null,
                          item.price !== undefined ? `¥${item.price.toLocaleString()}` : '価格未入力',
                        ]
                          .filter(Boolean)
                          .join(' ・ ')}
                      </div>
                      {item.expiryDate && (
                        <div className="row-sub">期限 {formatDateLabel(item.expiryDate).replace(/（.*）/, '')}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {selectedPurchase.receiptId && (
            <button className="btn btn-outline" onClick={() => setViewingReceipt(selectedPurchase.receiptId!)}>
              <ImageIcon size={16} /> レシートを見る
            </button>
          )}
        </BottomSheet>
      )}

      {editingPurchase && (
        <PurchaseEditSheet
          purchase={editingPurchase}
          onClose={() => setEditingPurchase(null)}
          onSaved={() => {}}
        />
      )}

      {viewingReceipt && (
        <ReceiptViewer receiptId={viewingReceipt} onClose={() => setViewingReceipt(null)} />
      )}
    </>
  );
}
