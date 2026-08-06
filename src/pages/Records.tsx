import { useEffect, useState } from 'react';
import { ClipboardList, Image as ImageIcon, Plus, Sun, Moon, Cookie } from 'lucide-react';
import { Header } from '../components/Header';
import { BottomSheet } from '../components/BottomSheet';
import { MealFormSheet } from '../components/MealFormSheet';
import { PurchaseFormSheet } from '../components/PurchaseFormSheet';
import { ReceiptViewer } from '../components/ReceiptViewer';
import { listMeals } from '../repositories/mealRepo';
import { listPurchases } from '../repositories/purchaseRepo';
import { useDataVersion } from '../hooks/useDataVersion';
import { useToast } from '../components/ToastProvider';
import { toUserMessage } from '../utils/errors';
import { formatDateLabel } from '../utils/date';
import type { Meal, Purchase } from '../types';

const MEAL_ICON = { 朝食: Sun, 昼食: Sun, 夕食: Moon, 間食: Cookie } as const;

export function Records() {
  const { showToast } = useToast();
  const version = useDataVersion();
  const [tab, setTab] = useState<'meals' | 'purchases'>('meals');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [showMealForm, setShowMealForm] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listMeals(), listPurchases()])
      .then(([m, p]) => {
        setMeals(m);
        setPurchases(p);
      })
      .catch((e) => showToast(toUserMessage(e, 'データの読み込みに失敗しました')));
  }, [version, showToast]);

  function mealContent(meal: Meal): string {
    if (meal.dishName) return meal.dishName;
    if (meal.mealKind === 'home' && meal.ingredientNames?.length) return meal.ingredientNames.join('・');
    if (meal.mealKind === 'eatout') return '外食';
    return '記録あり';
  }

  return (
    <>
      <Header
        icon={<ClipboardList size={20} />}
        title="記録"
        actions={
          <button
            className="btn btn-primary btn-sm"
            onClick={() => (tab === 'meals' ? setShowMealForm(true) : setShowPurchaseForm(true))}
          >
            <Plus size={16} /> {tab === 'meals' ? '食事を記録' : '買い物を記録'}
          </button>
        }
      />
      <div className="page-content">
        <div className="tabs">
          <button className={`tab${tab === 'meals' ? ' active' : ''}`} onClick={() => setTab('meals')}>
            食事の記録
          </button>
          <button className={`tab${tab === 'purchases' ? ' active' : ''}`} onClick={() => setTab('purchases')}>
            購入履歴
          </button>
        </div>

        {tab === 'meals' ? (
          <div className="card">
            {meals.length === 0 ? (
              <div className="empty-state">まだ食事記録がありません</div>
            ) : (
              meals.map((m) => {
                const Icon = MEAL_ICON[m.mealType];
                return (
                  <div className="list-row" key={m.id}>
                    <div className="row-emoji">
                      <Icon size={18} />
                    </div>
                    <div className="row-main">
                      <div className="row-title">{mealContent(m)}</div>
                      <div className="row-sub">
                        {formatDateLabel(m.date)} ・ {m.mealType}
                        {m.mealKind === 'eatout' && m.amount !== undefined && ` ・ ¥${m.amount.toLocaleString()}`}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
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

      {showMealForm && <MealFormSheet onClose={() => setShowMealForm(false)} />}
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
