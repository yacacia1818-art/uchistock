import { useEffect, useState } from 'react';
import { Sun, Moon, Cookie, Utensils, Home as HomeIcon, Store } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { IngredientUsageSelector } from './IngredientUsageSelector';
import { listIngredients } from '../repositories/ingredientRepo';
import { listAvailableCookedDishes, getCookedDish } from '../repositories/cookedDishRepo';
import { addMeal } from '../repositories/mealRepo';
import { addDirectMeal, addCookedMeal, addFreeTextMeal } from '../services/mealService';
import { cookAndEatNow } from '../services/cookingService';
import { updateMealWithInventory } from '../services/mealEditService';
import { buildEditableIngredientPool } from '../services/usageDiffService';
import { useToast } from './ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';
import { formatQuantity } from '../utils/quantity';
import { todayDateStr } from '../utils/date';
import type { CookedDish, Ingredient, IngredientUsage, Meal, MealHomeSource, MealType } from '../types';

const MEAL_TYPES: { type: MealType; icon: typeof Sun }[] = [
  { type: '朝食', icon: Sun },
  { type: '昼食', icon: Sun },
  { type: '夕食', icon: Moon },
  { type: '間食', icon: Cookie },
];

const HOME_SOURCES: { source: MealHomeSource; label: string }[] = [
  { source: 'direct', label: '在庫から' },
  { source: 'cooked', label: '調理済み' },
  { source: 'freeText', label: '自由入力' },
  { source: 'cookNow', label: '今作って食べた' },
];

interface MealFormSheetProps {
  onClose: () => void;
  initialMealType?: MealType;
  initialDishName?: string;
  initialHomeSource?: MealHomeSource;
  // 指定時は新規登録ではなく既存記録の編集モードで開く
  editingMeal?: Meal;
}

export function MealFormSheet({
  onClose,
  initialMealType,
  initialDishName,
  initialHomeSource,
  editingMeal,
}: MealFormSheetProps) {
  const { showToast } = useToast();
  const isEdit = !!editingMeal;
  const [date, setDate] = useState(editingMeal?.date ?? todayDateStr());
  const [mealType, setMealType] = useState<MealType>(editingMeal?.mealType ?? initialMealType ?? '朝食');
  const [mealKind, setMealKind] = useState<'home' | 'eatout'>(editingMeal?.mealKind ?? 'home');
  const [homeSource, setHomeSource] = useState<MealHomeSource>(
    editingMeal?.homeSource ?? initialHomeSource ?? 'direct'
  );
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [cookedDishes, setCookedDishes] = useState<CookedDish[]>([]);
  const [directUsages, setDirectUsages] = useState<IngredientUsage[]>(editingMeal?.ingredientUsages ?? []);
  const [selectedDishId, setSelectedDishId] = useState<string>(
    editingMeal?.homeSource === 'cooked' ? editingMeal.cookedDishId ?? '' : ''
  );
  const [freeTextRaw, setFreeTextRaw] = useState((editingMeal?.freeTextItems ?? []).join('\n'));
  const [dishName, setDishName] = useState(editingMeal?.dishName ?? initialDishName ?? '');
  const [memo, setMemo] = useState(editingMeal?.memo ?? '');
  const [amount, setAmount] = useState(editingMeal?.amount !== undefined ? String(editingMeal.amount) : '');
  const [storeName, setStoreName] = useState(editingMeal?.storeName ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listIngredients()
      .then((list) =>
        setIngredients(
          editingMeal ? buildEditableIngredientPool(list, editingMeal.ingredientUsages ?? []) : list
        )
      )
      .catch((e) => showToast(toUserMessage(e, '食材の読み込みに失敗しました')));
    listAvailableCookedDishes()
      .then(async (list) => {
        if (
          editingMeal?.homeSource === 'cooked' &&
          editingMeal.cookedDishId &&
          !list.some((d) => d.id === editingMeal.cookedDishId)
        ) {
          const current = await getCookedDish(editingMeal.cookedDishId);
          if (current) list = [current, ...list];
        }
        setCookedDishes(list);
      })
      .catch((e) => showToast(toUserMessage(e, '調理済み料理の読み込みに失敗しました')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  // 編集時は「今作って食べた」を新たに選ぶことはできない（元々cookNowの記録のみそのまま編集可能）
  const homeSourceOptions =
    isEdit && editingMeal?.homeSource !== 'cookNow'
      ? HOME_SOURCES.filter((s) => s.source !== 'cookNow')
      : HOME_SOURCES;

  async function handleSave() {
    setSaving(true);
    try {
      if (isEdit && editingMeal) {
        const amountNum = mealKind === 'eatout' ? Number(amount) : undefined;
        if (mealKind === 'eatout' && (amount.trim() === '' || Number.isNaN(amountNum))) {
          showToast('正しい金額を入力してください');
          setSaving(false);
          return;
        }
        const items = freeTextRaw
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        await updateMealWithInventory(editingMeal, {
          date,
          mealType,
          mealKind,
          homeSource,
          directUsages,
          selectedDishId,
          freeTextItems: items.length > 0 ? items : dishName.trim() ? [dishName.trim()] : [],
          dishName,
          memo,
          amount: amountNum,
          storeName,
        });
        notifyDataChanged();
        showToast('変更しました');
        onClose();
        return;
      }

      if (mealKind === 'eatout') {
        const amountNum = Number(amount);
        if (amount.trim() === '' || Number.isNaN(amountNum) || amountNum < 0) {
          showToast('正しい金額を入力してください');
          setSaving(false);
          return;
        }
        await addMeal({
          mealType,
          mealKind: 'eatout',
          amount: amountNum,
          dishName: dishName.trim() || undefined,
          storeName: storeName.trim() || undefined,
          memo: memo.trim() || undefined,
        });
      } else if (homeSource === 'direct') {
        await addDirectMeal({
          mealType,
          ingredientUsages: directUsages,
          dishName: dishName.trim() || undefined,
          memo: memo.trim() || undefined,
        });
      } else if (homeSource === 'cooked') {
        if (!selectedDishId) {
          showToast('調理済み料理を選択してください');
          setSaving(false);
          return;
        }
        const dish = cookedDishes.find((d) => d.id === selectedDishId);
        await addCookedMeal({
          mealType,
          cookedDishId: selectedDishId,
          dishName: dish?.name ?? '調理済み料理',
          memo: memo.trim() || undefined,
        });
      } else if (homeSource === 'freeText') {
        const items = freeTextRaw
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        if (items.length === 0 && !dishName.trim()) {
          showToast('食べたものを入力してください');
          setSaving(false);
          return;
        }
        await addFreeTextMeal({
          mealType,
          items: items.length > 0 ? items : [dishName.trim()],
          dishName: dishName.trim() || undefined,
          memo: memo.trim() || undefined,
        });
      } else if (homeSource === 'cookNow') {
        if (!dishName.trim()) {
          showToast('料理名を入力してください');
          setSaving(false);
          return;
        }
        if (directUsages.length === 0) {
          showToast('使用した食材を選択してください');
          setSaving(false);
          return;
        }
        await cookAndEatNow({
          name: dishName.trim(),
          ingredientUsages: directUsages,
          mealType,
          memo: memo.trim() || undefined,
        });
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

  const canSave =
    mealKind === 'eatout'
      ? amount.trim() !== '' && !Number.isNaN(Number(amount))
      : homeSource === 'cookNow'
        ? dishName.trim() !== '' && directUsages.length > 0
        : true;

  return (
    <BottomSheet title={isEdit ? '食事記録を編集' : '食事を記録'} onClose={onClose}>
      {isEdit && (
        <div className="field">
          <label>日付</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      )}

      <div className="meal-type-grid">
        {MEAL_TYPES.map(({ type, icon: Icon }) => (
          <button
            key={type}
            className={`meal-type-btn${mealType === type ? ' active' : ''}`}
            onClick={() => setMealType(type)}
          >
            <Icon size={18} />
            {type}
          </button>
        ))}
      </div>

      <div className="tabs">
        <button
          className={`tab${mealKind === 'home' ? ' active' : ''}`}
          onClick={() => setMealKind('home')}
        >
          <HomeIcon size={16} /> 自炊
        </button>
        <button
          className={`tab${mealKind === 'eatout' ? ' active' : ''}`}
          onClick={() => setMealKind('eatout')}
        >
          <Store size={16} /> 外食
        </button>
      </div>

      {mealKind === 'home' ? (
        <>
          <div className="chip-row">
            {homeSourceOptions.map(({ source, label }) => (
              <button
                key={source}
                className={`chip${homeSource === source ? ' active' : ''}`}
                onClick={() => setHomeSource(source)}
              >
                {label}
              </button>
            ))}
          </div>

          {(homeSource === 'direct' || homeSource === 'cookNow') && (
            <div className="field">
              <label>食べたものを選択（在庫から）</label>
              <IngredientUsageSelector
                ingredients={ingredients}
                value={directUsages}
                onChange={setDirectUsages}
              />
            </div>
          )}

          {homeSource === 'cooked' && (
            <div className="field">
              <label>調理済み料理から選ぶ</label>
              {cookedDishes.length === 0 ? (
                <p className="text-muted">調理済み料理がまだありません</p>
              ) : (
                <div className="card" style={{ padding: '4px 12px' }}>
                  {cookedDishes.map((dish) => (
                    <label className="checkbox-row" key={dish.id}>
                      <input
                        type="radio"
                        name="cookedDish"
                        checked={selectedDishId === dish.id}
                        onChange={() => setSelectedDishId(dish.id)}
                      />
                      <span style={{ flex: 1 }}>{dish.name}</span>
                      {dish.servingsRemaining !== undefined && (
                        <span className="text-muted" style={{ fontSize: 12 }}>
                          残り{dish.servingsRemaining}食
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {homeSource === 'freeText' && (
            <div className="field">
              <label>食べたものを自由入力（改行で複数）</label>
              <textarea
                className="textarea"
                value={freeTextRaw}
                onChange={(e) => setFreeTextRaw(e.target.value)}
                placeholder={'例：\n食パン\nコーヒー'}
              />
            </div>
          )}

          {homeSource === 'cookNow' && (
            <div className="field">
              <label>料理名（必須）</label>
              <input
                className="input"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                placeholder="例：鶏むね肉の照り焼き"
              />
            </div>
          )}
        </>
      ) : (
        <div className="field">
          <label>金額（必須）</label>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            placeholder="例：850"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      )}

      {mealKind === 'home' && homeSource !== 'cookNow' && homeSource !== 'cooked' && (
        <div className="field">
          <label>
            <Utensils size={12} style={{ verticalAlign: '-2px' }} /> 料理名（任意）
          </label>
          <input
            className="input"
            value={dishName}
            onChange={(e) => setDishName(e.target.value)}
            placeholder="例：鶏むね肉の照り焼き"
          />
        </div>
      )}

      {mealKind === 'eatout' && (
        <>
          <div className="field">
            <label>
              <Utensils size={12} style={{ verticalAlign: '-2px' }} /> 料理名（任意）
            </label>
            <input
              className="input"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              placeholder="例：ラーメン"
            />
          </div>
          <div className="field">
            <label>店名（任意）</label>
            <input
              className="input"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </div>
        </>
      )}

      <div className="field">
        <label>メモ（任意）</label>
        <textarea
          className="textarea"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="例：料理名や量など"
        />
      </div>

      {directUsages.length > 0 && (homeSource === 'direct' || homeSource === 'cookNow') && mealKind === 'home' && (
        <p className="text-muted mb-16" style={{ fontSize: 12 }}>
          {directUsages
            .map((u) => `${u.ingredientName} ${formatQuantity(u.usage.value, u.unit)}使用`)
            .join(' / ')}
        </p>
      )}

      <button className="btn btn-primary" onClick={handleSave} disabled={saving || !canSave}>
        {isEdit ? '変更を保存' : '保存'}
      </button>
    </BottomSheet>
  );
}
