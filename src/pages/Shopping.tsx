import { useEffect, useMemo, useState } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import { Header } from '../components/Header';
import { AddMemoSheet } from '../components/AddMemoSheet';
import { PurchaseFormSheet } from '../components/PurchaseFormSheet';
import { listIngredients } from '../repositories/ingredientRepo';
import {
  addShoppingMemoItem,
  listShoppingMemo,
  toggleShoppingMemoChecked,
  deleteShoppingMemoItem,
} from '../repositories/shoppingMemoRepo';
import { useDataVersion } from '../hooks/useDataVersion';
import { useToast } from '../components/ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import { formatMemoQuantity } from '../utils/quantity';
import type { Ingredient, ShoppingMemoItem } from '../types';

export function Shopping() {
  const { showToast } = useToast();
  const version = useDataVersion();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [memo, setMemo] = useState<ShoppingMemoItem[]>([]);
  const [showAddMemoOpen, setShowAddMemoOpen] = useState(false);
  const [showPurchaseCarry, setShowPurchaseCarry] = useState(false);
  const [showPurchaseDirect, setShowPurchaseDirect] = useState(false);

  useEffect(() => {
    Promise.all([listIngredients(), listShoppingMemo()])
      .then(([ing, m]) => {
        setIngredients(ing);
        setMemo(m);
      })
      .catch((e) => showToast(toUserMessage(e, 'データの読み込みに失敗しました')));
  }, [version, showToast]);

  const uncheckedMemo = memo.filter((m) => !m.checked);
  const checkedMemo = memo.filter((m) => m.checked);

  // 在庫からの提案：食品で在庫が切れている/僅かなもののうち、まだ買い物メモに無いもの
  const suggestions = useMemo(() => {
    const memoNames = new Set(memo.map((m) => m.name));
    return ingredients.filter((i) => {
      if (i.itemType === '日用品') return false;
      if (memoNames.has(i.name)) return false;
      if (i.quantityMode === 'gauge') return i.quantity <= 0.1;
      return i.quantity <= 0;
    });
  }, [ingredients, memo]);

  async function handleToggleMemo(item: ShoppingMemoItem) {
    try {
      await toggleShoppingMemoChecked(item.id, !item.checked);
      notifyDataChanged();
    } catch (e) {
      showToast(toUserMessage(e, '更新に失敗しました'));
    }
  }

  async function handleDeleteMemo(id: string) {
    try {
      await deleteShoppingMemoItem(id);
      notifyDataChanged();
      showToast('削除しました');
    } catch (e) {
      showToast(toUserMessage(e, '削除に失敗しました'));
    }
  }

  async function handleAddSuggestion(ingredient: Ingredient) {
    try {
      await addShoppingMemoItem({ name: ingredient.name, category: ingredient.itemType ?? '食品' });
      notifyDataChanged();
      showToast(`${ingredient.name}を買い物メモに追加しました`);
    } catch (e) {
      showToast(toUserMessage(e, '追加に失敗しました'));
    }
  }

  return (
    <>
      <Header
        icon={<ShoppingCart size={20} />}
        title="買い物"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddMemoOpen(true)}>
            <Plus size={16} /> 追加
          </button>
        }
      />
      <div className="page-content">
        <div className="card mb-16">
          <div className="section-title">買うものリスト</div>
          {memo.length === 0 ? (
            <div className="empty-state">買い物メモはまだありません</div>
          ) : (
            <>
              {uncheckedMemo.map((item) => (
                <label className="checkbox-row" key={item.id}>
                  <input type="checkbox" checked={false} onChange={() => handleToggleMemo(item)} />
                  <span style={{ flex: 1 }}>
                    {item.category === '日用品' && <span className="text-muted">🧻 </span>}
                    {item.name}
                    {formatMemoQuantity(item) && <span className="text-muted"> ・{formatMemoQuantity(item)}</span>}
                    {item.memo && <div className="row-sub">{item.memo}</div>}
                  </span>
                  <button
                    className="icon-btn"
                    onClick={() => handleDeleteMemo(item.id)}
                    aria-label="削除"
                    style={{ fontSize: 12, color: 'var(--color-text-muted)' }}
                  >
                    削除
                  </button>
                </label>
              ))}
              {checkedMemo.length > 0 && (
                <>
                  <div className="text-muted" style={{ fontSize: 12, margin: '10px 0 4px' }}>
                    購入済み
                  </div>
                  {checkedMemo.map((item) => (
                    <label className="checkbox-row" key={item.id}>
                      <input type="checkbox" checked={true} onChange={() => handleToggleMemo(item)} />
                      <span style={{ flex: 1, textDecoration: 'line-through', color: 'var(--color-text-muted)' }}>
                        {item.name}
                        {formatMemoQuantity(item) && <span> ・{formatMemoQuantity(item)}</span>}
                      </span>
                    </label>
                  ))}
                </>
              )}
            </>
          )}

          {suggestions.length > 0 && (
            <>
              <div className="text-muted" style={{ fontSize: 12, margin: '14px 0 4px' }}>
                在庫からのおすすめ　{suggestions.length}件
              </div>
              {suggestions.map((ing) => (
                <div
                  key={ing.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                  }}
                >
                  <span style={{ fontSize: 13 }}>{ing.name}</span>
                  <button className="btn btn-outline btn-sm" onClick={() => handleAddSuggestion(ing)}>
                    追加
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="section-title" style={{ marginTop: 4 }}>買ったものを記録</div>
        <div className="card mb-16">
          <p className="text-muted mb-16" style={{ fontSize: 12.5 }}>
            買い物メモにない購入も、ここから直接記録できます。
          </p>
          <button className="btn btn-primary" onClick={() => setShowPurchaseDirect(true)}>
            <ShoppingCart size={16} /> 買ったものを記録する
          </button>
          {checkedMemo.length > 0 && (
            <button className="btn btn-secondary mt-8" onClick={() => setShowPurchaseCarry(true)}>
              チェック済みの{checkedMemo.length}件から記録する
            </button>
          )}
        </div>
      </div>

      {showAddMemoOpen && <AddMemoSheet onClose={() => setShowAddMemoOpen(false)} />}
      {showPurchaseCarry && (
        <PurchaseFormSheet carriedItems={checkedMemo} onClose={() => setShowPurchaseCarry(false)} />
      )}
      {showPurchaseDirect && <PurchaseFormSheet onClose={() => setShowPurchaseDirect(false)} />}
    </>
  );
}
