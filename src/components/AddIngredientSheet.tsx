import { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { addIngredient } from '../repositories/ingredientRepo';
import { useToast } from './ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import type { IngredientCategory, RoughLevel, TrackType } from '../types';

const CATEGORIES: IngredientCategory[] = ['野菜', '肉・魚', '卵・乳製品', '主食', 'その他'];
const ROUGH_LEVELS: RoughLevel[] = ['多い', '半分', '少ない', 'なし'];

interface AddIngredientSheetProps {
  onClose: () => void;
}

export function AddIngredientSheet({ onClose }: AddIngredientSheetProps) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<IngredientCategory>('その他');
  const [trackType, setTrackType] = useState<TrackType>('rough');
  const [count, setCount] = useState(1);
  const [unit, setUnit] = useState('個');
  const [roughLevel, setRoughLevel] = useState<RoughLevel>('多い');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      showToast('食材名を入力してください');
      return;
    }
    setSaving(true);
    try {
      await addIngredient({
        name: name.trim(),
        category,
        trackType,
        count: trackType === 'count' ? count : undefined,
        unit: trackType === 'count' ? unit : undefined,
        roughLevel: trackType === 'rough' ? roughLevel : undefined,
      });
      notifyDataChanged();
      showToast('食材を追加しました');
      onClose();
    } catch (e) {
      showToast(toUserMessage(e, '保存に失敗しました'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet title="食材を追加" onClose={onClose}>
      <div className="field">
        <label>食材名（必須）</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>

      <div className="field">
        <label>カテゴリ</label>
        <div className="chip-row">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`chip${category === c ? ' active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>管理方式</label>
        <div className="tabs">
          <button
            className={`tab${trackType === 'rough' ? ' active' : ''}`}
            onClick={() => setTrackType('rough')}
          >
            ざっくり残量
          </button>
          <button
            className={`tab${trackType === 'count' ? ' active' : ''}`}
            onClick={() => setTrackType('count')}
          >
            数量管理
          </button>
        </div>
      </div>

      {trackType === 'rough' ? (
        <div className="field">
          <label>残量</label>
          <div className="chip-row">
            {ROUGH_LEVELS.map((r) => (
              <button
                key={r}
                className={`chip${roughLevel === r ? ' active' : ''}`}
                onClick={() => setRoughLevel(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid-2">
          <div className="field">
            <label>数量</label>
            <div className="stepper" style={{ justifyContent: 'space-between' }}>
              <button onClick={() => setCount((c) => Math.max(0, c - 1))}>−</button>
              <span>{count}</span>
              <button onClick={() => setCount((c) => c + 1)}>＋</button>
            </div>
          </div>
          <div className="field">
            <label>単位</label>
            <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
        </div>
      )}

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        追加する
      </button>
    </BottomSheet>
  );
}
