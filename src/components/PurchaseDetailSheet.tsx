import { Image as ImageIcon, Pencil } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { formatDateLabel } from '../utils/date';
import type { Purchase } from '../types';

interface PurchaseDetailSheetProps {
  purchase: Purchase;
  onClose: () => void;
  onEdit: () => void;
  onViewReceipt: (receiptId: string) => void;
}

// 購入1件の詳細表示（金額・店名・購入商品・レシート）。食費カレンダーの日別内訳から開く
export function PurchaseDetailSheet({ purchase, onClose, onEdit, onViewReceipt }: PurchaseDetailSheetProps) {
  return (
    <BottomSheet title="購入詳細" onClose={onClose}>
      <button className="btn btn-outline mb-16" onClick={onEdit}>
        <Pencil size={16} /> 編集
      </button>
      <div className="field">
        <label>日付</label>
        <div>{formatDateLabel(purchase.date)} {purchase.time}</div>
      </div>
      <div className="field">
        <label>合計金額</label>
        <div style={{ fontSize: 22, fontWeight: 800 }}>¥{purchase.totalAmount.toLocaleString()}</div>
      </div>
      {purchase.foodAmount !== undefined && purchase.foodAmount !== purchase.totalAmount && (
        <div className="field">
          <label>食費として計上した金額</label>
          <div>¥{purchase.foodAmount.toLocaleString()}</div>
        </div>
      )}
      {purchase.storeName && (
        <div className="field">
          <label>店名</label>
          <div>{purchase.storeName}</div>
        </div>
      )}
      {purchase.items && purchase.items.length > 0 && (
        <div className="field">
          <label>購入商品</label>
          <div className="card" style={{ padding: '4px 12px' }}>
            {purchase.items.map((item, idx) => (
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
      {purchase.receiptId && (
        <button className="btn btn-outline" onClick={() => onViewReceipt(purchase.receiptId!)}>
          <ImageIcon size={16} /> レシートを見る
        </button>
      )}
    </BottomSheet>
  );
}
