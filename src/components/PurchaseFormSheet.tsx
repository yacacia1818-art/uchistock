import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { addPurchase, saveReceiptImage } from '../repositories/purchaseRepo';
import { deleteShoppingMemoItems } from '../repositories/shoppingMemoRepo';
import { useToast } from './ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import type { ShoppingMemoItem } from '../types';

interface PurchaseFormSheetProps {
  onClose: () => void;
  carriedItems?: ShoppingMemoItem[];
}

export function PurchaseFormSheet({ onClose, carriedItems }: PurchaseFormSheetProps) {
  const { showToast } = useToast();
  const [totalAmount, setTotalAmount] = useState('');
  const [storeName, setStoreName] = useState('');
  const [itemsText, setItemsText] = useState(
    carriedItems ? carriedItems.map((i) => i.name).join('\n') : ''
  );
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    const amountNum = Number(totalAmount);
    if (totalAmount.trim() === '' || Number.isNaN(amountNum) || amountNum < 0) {
      showToast('正しい金額を入力してください');
      return;
    }
    setSaving(true);
    try {
      let receiptId: string | undefined;
      if (receiptFile) {
        try {
          receiptId = await saveReceiptImage(receiptFile);
        } catch (e) {
          showToast(toUserMessage(e, 'レシート画像の保存に失敗しました'));
        }
      }
      const items = itemsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name }));

      await addPurchase({
        totalAmount: amountNum,
        storeName: storeName.trim() || undefined,
        items: items.length > 0 ? items : undefined,
        receiptId,
      });

      if (carriedItems && carriedItems.length > 0) {
        await deleteShoppingMemoItems(carriedItems.map((i) => i.id));
      }

      notifyDataChanged();
      showToast('記録しました');
      onClose();
    } catch (e) {
      showToast(toUserMessage(e, '保存に失敗しました'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet title="買い物を記録" onClose={onClose}>
      <div className="field">
        <label>合計金額（必須）</label>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          placeholder="例：2860"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          autoFocus
        />
      </div>

      <div className="field">
        <label>店名（任意）</label>
        <input className="input" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
      </div>

      <div className="field">
        <label>購入商品（任意・1行に1つ）</label>
        <textarea
          className="textarea"
          value={itemsText}
          onChange={(e) => setItemsText(e.target.value)}
          placeholder={'例：\n卵\n牛乳'}
        />
      </div>

      <div className="field">
        <label>レシート画像（任意）</label>
        {receiptPreview ? (
          <img
            src={receiptPreview}
            alt="レシートプレビュー"
            style={{ width: '100%', borderRadius: 12, maxHeight: 220, objectFit: 'contain', background: '#fff' }}
          />
        ) : (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera size={18} /> 撮影・画像を選択
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        保存
      </button>
    </BottomSheet>
  );
}
