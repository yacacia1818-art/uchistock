import { useEffect, useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { IngredientUsageSelector } from './IngredientUsageSelector';
import { listIngredients } from '../repositories/ingredientRepo';
import { cookDish } from '../services/cookingService';
import { useToast } from './ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import type { Ingredient, IngredientUsage } from '../types';

interface CookingFormSheetProps {
  onClose: () => void;
}

export function CookingFormSheet({ onClose }: CookingFormSheetProps) {
  const { showToast } = useToast();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [name, setName] = useState('');
  const [usages, setUsages] = useState<IngredientUsage[]>([]);
  const [servings, setServings] = useState<string>('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listIngredients()
      .then(setIngredients)
      .catch((e) => showToast(toUserMessage(e, '食材の読み込みに失敗しました')));
  }, [showToast]);

  async function handleSave() {
    if (!name.trim()) {
      showToast('料理名を入力してください');
      return;
    }
    if (usages.length === 0) {
      showToast('使用した食材を選択してください');
      return;
    }
    const servingsNum = servings.trim() === '' ? undefined : Number(servings);
    if (servingsNum !== undefined && (!Number.isFinite(servingsNum) || servingsNum <= 0)) {
      showToast('完成量には1以上の数値を入力してください');
      return;
    }
    setSaving(true);
    try {
      await cookDish({
        name: name.trim(),
        ingredientUsages: usages,
        servings: servingsNum,
        memo: memo.trim() || undefined,
      });
      notifyDataChanged();
      showToast('調理を記録しました');
      onClose();
    } catch (e) {
      showToast(toUserMessage(e, '保存に失敗しました'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet title="調理を記録" onClose={onClose}>
      <div className="field">
        <label>料理名（必須）</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：豚の生姜焼き"
          autoFocus
        />
      </div>

      <div className="field">
        <label>使用した食材（必須）</label>
        <IngredientUsageSelector ingredients={ingredients} value={usages} onChange={setUsages} />
      </div>

      <div className="field">
        <label>完成量・何食分できたか（任意）</label>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          placeholder="例：3"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
        />
      </div>

      <div className="field">
        <label>メモ（任意）</label>
        <textarea className="textarea" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        保存
      </button>
    </BottomSheet>
  );
}
