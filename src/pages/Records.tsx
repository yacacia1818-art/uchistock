import { useEffect, useState } from 'react';
import { ClipboardList, Image as ImageIcon, Plus, Sun, Moon, Cookie } from 'lucide-react';
import { Header } from '../components/Header';
import { BottomSheet } from '../components/BottomSheet';
import { MealFormSheet } from '../components/MealFormSheet';
import { CookingFormSheet } from '../components/CookingFormSheet';
import { PurchaseFormSheet } from '../components/PurchaseFormSheet';
import { ReceiptViewer } from '../components/ReceiptViewer';
import { RecordTypeChooserSheet, type RecordChoice } from '../components/RecordTypeChooserSheet';
import { listMeals } from '../repositories/mealRepo';
import { listPurchases } from '../repositories/purchaseRepo';
import { listCookedDishes } from '../repositories/cookedDishRepo';
import { useDataVersion } from '../hooks/useDataVersion';
import { useToast } from '../components/ToastProvider';
import { toUserMessage } from '../utils/errors';
import { formatDateLabel } from '../utils/date';
import { formatQuantity } from '../utils/quantity';
import { mealContentLabel, mealSubLabel } from '../utils/mealDisplay';
import type { CookedDish, Meal, Purchase } from '../types';

const MEAL_ICON = { 朝食: Sun, 昼食: Sun, 夕食: Moon, 間食: Cookie } as const;

type RecordsTab = 'meals' | 'cooking' | 'purchases';

export function Records() {
  const { showToast } = useToast();
  const version = useDataVersion();
  const [tab, setTab] = useState<RecordsTab>('meals');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [cookedDishes, setCookedDishes] = useState<CookedDish[]>([]);
  const [showChooser, setShowChooser] = useState(false);
  const [showMealForm, setShowMealForm] = useState(false);
  const [showCookingForm, setShowCookingForm] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listMeals(), listPurchases(), listCookedDishes()])
      .then(([m, p, c]) => {
        setMeals(m);
        setPurchases(p);
        setCookedDishes(c);
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
          <button className={`tab${tab === 'meals' ? ' active' : ''}`} onClick={() => setTab('meals')}>
            食事
          </button>
          <button className={`tab${tab === 'cooking' ? ' active' : ''}`} onClick={() => setTab('cooking')}>
            調理
          </button>
          <button className={`tab${tab === 'purchases' ? ' active' : ''}`} onClick={() => setTab('purchases')}>
            購入
          </button>
        </div>

        {tab === 'meals' && (
          <div className="card">
            {meals.length === 0 ? (
              <div className="empty-state">まだ食事記録がありません</div>
            ) : (
              meals.map((m) => {
                const Icon = MEAL_ICON[m.mealType];
                const sub = mealSubLabel(m);
                return (
                  <div className="list-row" key={m.id}>
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
                  </div>
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
                <div className="list-row" key={dish.id} style={{ alignItems: 'flex-start' }}>
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
                </div>
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
        <RecordTypeChooserSheet onClose={() => setShowChooser(false)} onChoose={handleChoose} />
      )}
      {showMealForm && <MealFormSheet onClose={() => setShowMealForm(false)} />}
      {showCookingForm && <CookingFormSheet onClose={() => setShowCookingForm(false)} />}
      {showPurchaseForm && <PurchaseFormSheet onClose={() => setShowPurchaseForm(false)} />}

      {selectedPurchase && (
        <BottomSheet title="購入詳細" onClose={() => setSelectedPurchase(null)}>
          <div className="field">
            <label>日付</label>
            <div>{formatDateLabel(selectedPurchase.date)} {selectedPurchase.time}</div>
          </div>
          <div className="field">
            <label>合計金額</label>
            <div style={{ fontSize: 22, fontWeight: 800 }}>¥{selectedPurchase.totalAmount.toLocaleString()}</div>
          </div>
          {selectedPurchase.storeName && (
            <div className="field">
              <label>店名</label>
              <div>{selectedPurchase.storeName}</div>
            </div>
          )}
          {selectedPurchase.items && selectedPurchase.items.length > 0 && (
            <div className="field">
              <label>購入商品</label>
              <div>{selectedPurchase.items.map((i) => i.name).join('・')}</div>
            </div>
          )}
          {selectedPurchase.receiptId && (
            <button className="btn btn-outline" onClick={() => setViewingReceipt(selectedPurchase.receiptId!)}>
              <ImageIcon size={16} /> レシートを見る
            </button>
          )}
        </BottomSheet>
      )}

      {viewingReceipt && (
        <ReceiptViewer receiptId={viewingReceipt} onClose={() => setViewingReceipt(null)} />
      )}
    </>
  );
}
