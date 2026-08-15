import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '../components/Header';
import { PurchaseDetailSheet } from '../components/PurchaseDetailSheet';
import { PurchaseEditSheet } from '../components/PurchaseEditSheet';
import { ReceiptViewer } from '../components/ReceiptViewer';
import { listPurchasesByDateRange } from '../repositories/purchaseRepo';
import { listMealsByDateRange } from '../repositories/mealRepo';
import { foodPortionOf } from '../services/foodCost';
import { useDataVersion } from '../hooks/useDataVersion';
import { useToast } from '../components/ToastProvider';
import { toUserMessage } from '../utils/errors';
import { addMonths, cellsOfMonth, currentYearMonth, daysInMonth, formatMonthLabel, todayDateStr } from '../utils/date';
import type { Meal, Purchase } from '../types';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// 「今月の食費」の内訳を日別に確認するための専用カレンダー。
// グラフや収支分析はあえて持たせず、金額の一覧性のみを目的にする
export function FoodCostCalendar() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const version = useDataVersion();
  const [ym, setYm] = useState(currentYearMonth());
  const [selectedDate, setSelectedDate] = useState(todayDateStr());
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [eatOutMeals, setEatOutMeals] = useState<Meal[]>([]);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  useEffect(() => {
    const start = `${ym}-01`;
    const end = `${ym}-${String(daysInMonth(ym)).padStart(2, '0')}`;
    Promise.all([listPurchasesByDateRange(start, end), listMealsByDateRange(start, end)])
      .then(([p, meals]) => {
        setPurchases(p);
        setEatOutMeals(meals.filter((m) => m.mealKind === 'eatout' && m.amount));
      })
      .catch((e) => showToast(toUserMessage(e, 'データの読み込みに失敗しました')));
  }, [ym, version, showToast]);

  const dailyTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of purchases) {
      map.set(p.date, (map.get(p.date) ?? 0) + foodPortionOf(p));
    }
    for (const m of eatOutMeals) {
      map.set(m.date, (map.get(m.date) ?? 0) + (m.amount ?? 0));
    }
    return map;
  }, [purchases, eatOutMeals]);

  const monthTotal = useMemo(() => {
    let sum = 0;
    for (const v of dailyTotals.values()) sum += v;
    return sum;
  }, [dailyTotals]);

  const selectedPurchases = purchases.filter((p) => p.date === selectedDate);
  const selectedEatOut = eatOutMeals.filter((m) => m.date === selectedDate);
  const selectedTotal = dailyTotals.get(selectedDate) ?? 0;

  const cells = cellsOfMonth(ym);
  const today = todayDateStr();

  return (
    <>
      <Header
        icon={
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label="戻る" style={{ padding: 0 }}>
            <ChevronLeft size={22} />
          </button>
        }
        title="食費カレンダー"
        subtitle={`${formatMonthLabel(ym)}　食費合計 ¥${monthTotal.toLocaleString()}`}
      />
      <div className="page-content">
        <div className="card mb-16">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button className="icon-btn" onClick={() => setYm((prev) => addMonths(prev, -1))} aria-label="前の月">
              <ChevronLeft size={18} />
            </button>
            <strong>{formatMonthLabel(ym)}</strong>
            <button className="icon-btn" onClick={() => setYm((prev) => addMonths(prev, 1))} aria-label="次の月">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="calendar-grid">
            {WEEKDAYS.map((w) => (
              <div className="calendar-weekday" key={w}>
                {w}
              </div>
            ))}
            {cells.map((c, idx) => {
              if (!c.date) return <div key={idx} />;
              const isToday = c.date === today;
              const isSelected = c.date === selectedDate;
              const amount = dailyTotals.get(c.date);
              return (
                <button
                  key={c.date}
                  className={`cost-cell${isToday ? ' today' : ''}${isSelected && !isToday ? ' selected' : ''}`}
                  onClick={() => setSelectedDate(c.date!)}
                >
                  <span className="cost-day">{Number(c.date.slice(-2))}</span>
                  <span className="cost-amount">{amount ? amount.toLocaleString() : ''}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>
            {Number(selectedDate.slice(5, 7))}月{Number(selectedDate.slice(8, 10))}日の内訳　¥{selectedTotal.toLocaleString()}
          </div>
          {selectedPurchases.length === 0 && selectedEatOut.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13 }}>この日の記録はありません</p>
          ) : (
            <>
              {selectedPurchases.map((p) => (
                <button
                  key={p.id}
                  className="item-row"
                  style={{ width: '100%', border: 'none', background: 'none', font: 'inherit', cursor: 'pointer' }}
                  onClick={() => setSelectedPurchase(p)}
                >
                  <span>{p.storeName || '買い物'}</span>
                  <span>¥{foodPortionOf(p).toLocaleString()}</span>
                </button>
              ))}
              {selectedEatOut.map((m) => (
                <div className="item-row" key={m.id}>
                  <span>外食（{m.mealType}）{m.storeName ? `・${m.storeName}` : ''}</span>
                  <span>¥{(m.amount ?? 0).toLocaleString()}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {selectedPurchase && (
        <PurchaseDetailSheet
          purchase={selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
          onEdit={() => {
            setEditingPurchase(selectedPurchase);
            setSelectedPurchase(null);
          }}
          onViewReceipt={(receiptId) => setViewingReceipt(receiptId)}
        />
      )}
      {editingPurchase && (
        <PurchaseEditSheet purchase={editingPurchase} onClose={() => setEditingPurchase(null)} onSaved={() => {}} />
      )}
      {viewingReceipt && <ReceiptViewer receiptId={viewingReceipt} onClose={() => setViewingReceipt(null)} />}
    </>
  );
}
