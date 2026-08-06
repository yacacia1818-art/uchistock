import { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { addRecipe, updateRecipe } from '../repositories/recipeRepo';
import { useToast } from './ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import type { Recipe, RecipeCategory } from '../types';

const CATEGORIES: RecipeCategory[] = ['主食', '主菜', '副菜', 'おやつ', 'その他'];

interface RecipeFormSheetProps {
  onClose: () => void;
  onSaved?: (recipe: Recipe) => void;
  existing?: Recipe;
}

export function RecipeFormSheet({ onClose, onSaved, existing }: RecipeFormSheetProps) {
  const { showToast } = useToast();
  const [name, setName] = useState(existing?.name ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [category, setCategory] = useState<RecipeCategory | undefined>(existing?.category);
  const [ingredients, setIngredients] = useState(existing?.ingredients ?? '');
  const [memo, setMemo] = useState(existing?.memo ?? '');
  const [favorite, setFavorite] = useState(existing?.favorite ?? false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim() || !body.trim()) {
      showToast('料理名とレシピ本文を入力してください');
      return;
    }
    setSaving(true);
    try {
      const saved = existing
        ? await updateRecipe({
            ...existing,
            name: name.trim(),
            body,
            category,
            ingredients: ingredients.trim() || undefined,
            memo: memo.trim() || undefined,
            favorite,
          })
        : await addRecipe({
            name: name.trim(),
            body,
            category,
            ingredients: ingredients.trim() || undefined,
            memo: memo.trim() || undefined,
            favorite,
          });
      notifyDataChanged();
      showToast('レシピを保存しました');
      onSaved?.(saved);
      onClose();
    } catch (e) {
      showToast(toUserMessage(e, '保存に失敗しました'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet title={existing ? 'レシピを編集' : 'レシピを追加'} onClose={onClose}>
      <div className="field">
        <label>料理名（必須）</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label>カテゴリ（任意）</label>
        <div className="chip-row">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`chip${category === c ? ' active' : ''}`}
              onClick={() => setCategory(category === c ? undefined : c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>使用食材（任意）</label>
        <input className="input" value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="例：鶏むね肉・醤油・みりん・砂糖" />
      </div>
      <div className="field">
        <label>レシピ本文（必須）</label>
        <textarea
          className="textarea"
          style={{ minHeight: 160 }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="ChatGPT等で作成したレシピを貼り付け"
        />
      </div>
      <div className="field">
        <label>メモ（任意）</label>
        <input className="input" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>
      <label className="checkbox-row" style={{ padding: '4px 0 16px' }}>
        <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} />
        <span>お気に入りに追加</span>
      </label>
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        保存
      </button>
    </BottomSheet>
  );
}
