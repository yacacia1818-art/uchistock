import { useMemo, useRef, useState } from 'react';
import { Camera, Plus, Trash2 } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { recordPurchase } from '../services/purchaseService';
import { useToast } from './ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import { parseMemoQuantity } from '../utils/quantity';
import { generateId } from '../utils/id';
import { UNIT_OPTIONS } from '../types';
import type { HouseholdCategory, IngredientCategory, ShoppingCategory, ShoppingMemoItem } from '../types';

const INGREDIENT_CATEGORIES: IngredientCategory[] = ['野菜', '肉・魚', '卵・乳製品', '主食', 'その他'];
const HOUSEHOLD_CATEGORIES: HouseholdCategory[] = ['洗剤・掃除用品', '衛生用品', '薬・医薬品', '文房具・雑貨', 'その他'];

interface PurchaseFormSheetProps {
  onClose: () => void;
  carriedItems?: ShoppingMemoItem[];
}

interface PurchaseRow {
  id: string;
  name: string;
  category: ShoppingCategory;
  quantity: string;
  unit: string;
  price: string;
  addToInventory: boolean;
  convertUnit: boolean;
  invQuantity: string;
  invUnit: string;
  expiryDate: string;
  ingredientCategory: IngredientCategory | HouseholdCategory;
}

function buildRowFromMemoItem(item: ShoppingMemoItem): PurchaseRow {
  const category = item.category ?? '食品';
  const { quantity, unit } =
    item.quantityValue && item.unit
      ? { quantity: item.quantityValue, unit: item.unit }
      : parseMemoQuantity(item.quantity);
  return {
    id: item.id,
    name: item.name,
    category,
    quantity: String(quantity),
    unit,
    price: '',
    addToInventory: true,
    convertUnit: false,
    invQuantity: String(quantity),
    invUnit: unit,
    expiryDate: '',
    ingredientCategory: 'その他',
  };
}

function blankRow(): PurchaseRow {
  return {
    id: generateId(),
    name: '',
    category: '食品',
    quantity: '',
    unit: '個',
    price: '',
    addToInventory: true,
    convertUnit: false,
    invQuantity: '',
    invUnit: '個',
    expiryDate: '',
    ingredientCategory: 'その他',
  };
}

export function PurchaseFormSheet({ onClose, carriedItems }: PurchaseFormSheetProps) {
  const { showToast } = useToast();
  const [storeName, setStoreName] = useState('');
  const [rows, setRows] = useState<PurchaseRow[]>(
    carriedItems && carriedItems.length > 0 ? carriedItems.map(buildRowFromMemoItem) : [blankRow()]
  );
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 商品ごとの金額（今回その商品にかかった合計金額）を積み上げて購入全体の合計を出す。
  // ユーザーに暗算させないため、合計は常にここから自動算出し、手入力欄は持たない
  const computedTotal = useMemo(
    () => rows.reduce((sum, r) => (r.name.trim() && r.price.trim() !== '' ? sum + (Number(r.price) || 0) : sum), 0),
    [rows]
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  }

  function updateRow(id: string, patch: Partial<PurchaseRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSave() {
    const validRows = rows.filter((r) => r.name.trim());
    if (validRows.length === 0) {
      showToast('商品を1つ以上入力してください');
      return;
    }
    const missingPrice = validRows.find((r) => r.price.trim() === '' || Number.isNaN(Number(r.price)) || Number(r.price) < 0);
    if (missingPrice) {
      showToast(`「${missingPrice.name}」の金額を入力してください`);
      return;
    }
    const amountNum = computedTotal;
    const foodAmountNum = validRows
      .filter((r) => r.category === '食品')
      .reduce((sum, r) => sum + Number(r.price), 0);

    setSaving(true);
    try {
      const items = validRows.map((r) => {
        const qty = r.quantity.trim() !== '' ? Number(r.quantity) : undefined;
        return {
          id: r.id,
          name: r.name.trim(),
          quantity: qty !== undefined && Number.isFinite(qty) && qty > 0 ? qty : undefined,
          unit: qty !== undefined && Number.isFinite(qty) && qty > 0 ? r.unit : undefined,
          category: r.category,
          price: r.price.trim() !== '' && Number.isFinite(Number(r.price)) ? Number(r.price) : undefined,
          expiryDate: r.category === '食品' && r.expiryDate ? r.expiryDate : undefined,
        };
      });

      const inventoryAdditions = validRows
        .filter((r) => r.addToInventory)
        .map((r) => {
          const invQty = r.convertUnit ? r.invQuantity : r.quantity;
          const invUnit = r.convertUnit ? r.invUnit : r.unit;
          const qty = invQty.trim() !== '' ? Number(invQty) : 1;
          return {
            itemId: r.id,
            name: r.name.trim(),
            unit: invUnit || '個',
            quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
            expiryDate: r.category === '食品' ? r.expiryDate || undefined : undefined,
            category: r.ingredientCategory,
            itemType: r.category,
          };
        });

      await recordPurchase({
        totalAmount: amountNum,
        foodAmount: foodAmountNum,
        storeName: storeName.trim() || undefined,
        items: items.length > 0 ? items : undefined,
        receiptFile,
        carriedMemoIds: carriedItems?.map((i) => i.id),
        inventoryAdditions,
      });

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
    <BottomSheet title="購入を記録" onClose={onClose}>
      <div className="field">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <label style={{ marginBottom: 0 }}>合計金額</label>
          <div className="display" style={{ fontSize: 26, fontWeight: 800 }}>
            ¥{computedTotal.toLocaleString()}
          </div>
        </div>
        <p className="text-muted" style={{ fontSize: 12 }}>商品ごとの金額を入力すると自動で計算されます</p>
      </div>

      <div className="field">
        <label>店名（任意）</label>
        <input className="input" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
      </div>

      <div className="field">
        <label>購入したもの（必須）</label>
        {rows.length > 0 && (
          <div className="card mb-8" style={{ padding: '4px 12px' }}>
            {rows.map((row, idx) => (
              <div key={row.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <input
                    className="input"
                    style={{ flex: 1 }}
                    placeholder="商品名"
                    value={row.name}
                    onChange={(e) => updateRow(row.id, { name: e.target.value })}
                    autoFocus={idx === 0}
                  />
                  <button className="icon-btn" onClick={() => removeRow(row.id)} aria-label="削除">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="chip-row" style={{ marginBottom: 8 }}>
                  {(['食品', '日用品'] as ShoppingCategory[]).map((c) => (
                    <button
                      key={c}
                      className={`chip${row.category === c ? ' active' : ''}`}
                      onClick={() => updateRow(row.id, { category: c, ingredientCategory: 'その他' })}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <input
                    className="input"
                    type="number"
                    inputMode="decimal"
                    placeholder="数量"
                    style={{ width: 72, padding: '8px 10px' }}
                    value={row.quantity}
                    onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                  />
                  <select
                    className="select"
                    style={{ width: 84, padding: '8px 6px' }}
                    value={row.unit}
                    onChange={(e) => updateRow(row.id, { unit: e.target.value })}
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    placeholder="金額（必須）"
                    style={{ flex: 1, minWidth: 100, padding: '8px 10px' }}
                    value={row.price}
                    onChange={(e) => updateRow(row.id, { price: e.target.value })}
                  />
                  <span className="text-muted" style={{ alignSelf: 'center', fontSize: 13 }}>
                    円
                  </span>
                </div>

                <label className="checkbox-row" style={{ padding: '4px 0', borderBottom: 'none' }}>
                  <input
                    type="checkbox"
                    checked={row.addToInventory}
                    onChange={(e) => updateRow(row.id, { addToInventory: e.target.checked })}
                  />
                  <span>在庫に追加</span>
                </label>

                {row.addToInventory && (
                  <div style={{ paddingLeft: 4 }}>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: 12, padding: 0, marginBottom: row.convertUnit ? 8 : 0 }}
                      onClick={() =>
                        updateRow(row.id, {
                          convertUnit: !row.convertUnit,
                          invQuantity: row.invQuantity || row.quantity,
                          invUnit: row.invUnit || row.unit,
                        })
                      }
                    >
                      {row.convertUnit ? '単位変換をやめる' : '在庫の単位を変更する（任意）'}
                    </button>
                    {row.convertUnit && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                        <span className="text-muted" style={{ fontSize: 12 }}>
                          在庫へ
                        </span>
                        <input
                          className="input"
                          type="number"
                          inputMode="decimal"
                          style={{ width: 72, padding: '8px 10px' }}
                          value={row.invQuantity}
                          onChange={(e) => updateRow(row.id, { invQuantity: e.target.value })}
                        />
                        <select
                          className="select"
                          style={{ width: 84, padding: '8px 6px' }}
                          value={row.invUnit}
                          onChange={(e) => updateRow(row.id, { invUnit: e.target.value })}
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div style={{ marginBottom: row.category === '食品' ? 8 : 0 }}>
                      <span className="text-muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                        {row.category === '食品' ? '食材カテゴリ' : '日用品カテゴリ'}
                      </span>
                      <div className="chip-row">
                        {(row.category === '食品' ? INGREDIENT_CATEGORIES : HOUSEHOLD_CATEGORIES).map((c) => (
                          <button
                            key={c}
                            className={`chip${row.ingredientCategory === c ? ' active' : ''}`}
                            onClick={() => updateRow(row.id, { ingredientCategory: c })}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                    {row.category === '食品' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="text-muted" style={{ fontSize: 12 }}>
                          期限
                        </span>
                        <input
                          className="input"
                          type="date"
                          style={{ flex: 1, padding: '8px 10px' }}
                          value={row.expiryDate}
                          onChange={(e) => updateRow(row.id, { expiryDate: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <button type="button" className="btn btn-outline" onClick={() => setRows((prev) => [...prev, blankRow()])}>
          <Plus size={16} /> 商品を追加
        </button>
        <p className="text-muted mt-8" style={{ fontSize: 12 }}>
          ※ 各商品の金額を入力すると、合計金額が自動で計算されます。食品・日用品どちらも在庫へ反映できます。
        </p>
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
