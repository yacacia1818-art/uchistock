import { useState } from 'react';
import type { Ingredient, IngredientUsage, UsageAmount } from '../types';
import { FRACTION_CHOICES, formatQuantity, formatStock, getUsageMode, type UsageMode } from '../utils/quantity';

interface IngredientUsageSelectorProps {
  ingredients: Ingredient[];
  value: IngredientUsage[];
  onChange: (usages: IngredientUsage[]) => void;
}

interface CustomFractionInput {
  num: string;
  den: string;
}

export function IngredientUsageSelector({ ingredients, value, onChange }: IngredientUsageSelectorProps) {
  const [customFractions, setCustomFractions] = useState<Record<string, CustomFractionInput>>({});
  const [modeOverride, setModeOverride] = useState<Record<string, UsageMode>>({});

  const available = ingredients.filter((i) => i.quantity > 0);
  const selectedMap = new Map(value.map((u) => [u.ingredientId, u]));

  function modeFor(ingredient: Ingredient): UsageMode {
    // 既に選択済みの場合は、実際に保持している値の種類（usage.type）を必ず優先する。
    // 単位から推測した既定モードを優先すると、編集画面を開いた直後など
    // 「実際は割合(fraction)で保存されているのに個数(count)モードとして表示され、
    // 生の小数（例: 0.3333333333333333）がそのまま出てしまう」不具合が起きるため
    const selected = selectedMap.get(ingredient.id);
    if (selected) return selected.usage.type;
    if (ingredient.quantity < 1) return 'fraction';
    return modeOverride[ingredient.id] ?? getUsageMode(ingredient.unit);
  }

  function toggle(ingredient: Ingredient) {
    if (selectedMap.has(ingredient.id)) {
      onChange(value.filter((u) => u.ingredientId !== ingredient.id));
      return;
    }
    const mode = modeFor(ingredient);
    const defaultValue = mode === 'count' ? 1 : Math.min(1 / 3, ingredient.quantity);
    const defaultAmount: UsageAmount =
      mode === 'count' ? { type: 'count', value: defaultValue } : { type: 'fraction', value: defaultValue };
    onChange([
      ...value,
      { ingredientId: ingredient.id, ingredientName: ingredient.name, unit: ingredient.unit, usage: defaultAmount },
    ]);
  }

  function updateUsage(ingredientId: string, usage: UsageAmount) {
    onChange(value.map((u) => (u.ingredientId === ingredientId ? { ...u, usage } : u)));
  }

  function selectFraction(ingredient: Ingredient, rawValue: number) {
    // 在庫を超える使用量は選択できないよう、残量までクランプする（マイナス在庫防止）
    const clamped = Math.min(rawValue, ingredient.quantity);
    updateUsage(ingredient.id, { type: 'fraction', value: clamped });
  }

  function switchMode(ingredient: Ingredient, mode: UsageMode) {
    setModeOverride((prev) => ({ ...prev, [ingredient.id]: mode }));
    if (!selectedMap.has(ingredient.id)) return;
    if (mode === 'count') {
      updateUsage(ingredient.id, { type: 'count', value: 1 });
    } else {
      updateUsage(ingredient.id, { type: 'fraction', value: Math.min(1 / 3, ingredient.quantity) });
    }
  }

  return (
    <div className="card" style={{ padding: '4px 12px' }}>
      {available.length === 0 ? (
        <p className="text-muted" style={{ padding: '12px 0' }}>
          在庫がまだ登録されていません
        </p>
      ) : (
        available.map((ingredient) => {
          const selected = selectedMap.get(ingredient.id);
          const mode = modeFor(ingredient);
          const canToggleMode = ingredient.quantity >= 1;
          const maxCount = Math.max(1, Math.floor(ingredient.quantity));
          const custom = customFractions[ingredient.id];
          return (
            <div key={ingredient.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <label className="checkbox-row" style={{ borderBottom: 'none' }}>
                <input type="checkbox" checked={!!selected} onChange={() => toggle(ingredient)} />
                <span style={{ flex: 1 }}>{ingredient.name}</span>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  在庫 {formatStock(ingredient)}
                </span>
              </label>
              {selected && (
                <div style={{ padding: '0 4px 12px 30px' }}>
                  {canToggleMode && (
                    <div className="chip-row" style={{ marginBottom: 8 }}>
                      <button
                        className={`chip${mode === 'count' ? ' active' : ''}`}
                        onClick={() => switchMode(ingredient, 'count')}
                      >
                        個数で指定
                      </button>
                      <button
                        className={`chip${mode === 'fraction' ? ' active' : ''}`}
                        onClick={() => switchMode(ingredient, 'fraction')}
                      >
                        割合で指定
                      </button>
                    </div>
                  )}
                  {mode === 'count' ? (
                    <div className="stepper" style={{ justifyContent: 'flex-start', width: 'fit-content' }}>
                      <button
                        onClick={() =>
                          updateUsage(ingredient.id, {
                            type: 'count',
                            value: Math.max(1, Math.round(selected.usage.value) - 1),
                          })
                        }
                      >
                        −
                      </button>
                      <span>
                        {/* 万一rawなdecimal値が紛れ込んでいても、生の小数を画面に出さないための保険 */}
                        {formatQuantity(selected.usage.value, ingredient.unit)}使用
                      </span>
                      <button
                        onClick={() =>
                          updateUsage(ingredient.id, {
                            type: 'count',
                            value: Math.min(maxCount, Math.round(selected.usage.value) + 1),
                          })
                        }
                      >
                        ＋
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="chip-row wrap" style={{ marginBottom: 0 }}>
                        {FRACTION_CHOICES.map((choice) => {
                          const isCustom = choice.value === 'custom';
                          const isAll = choice.value === 'all';
                          const active =
                            (isAll && Math.abs(selected.usage.value - ingredient.quantity) < 1e-9) ||
                            (!isAll &&
                              !isCustom &&
                              typeof choice.value === 'number' &&
                              Math.abs(selected.usage.value - Math.min(choice.value, ingredient.quantity)) < 1e-9);
                          return (
                            <button
                              key={choice.label}
                              className={`chip${active ? ' active' : ''}`}
                              onClick={() => {
                                if (isAll) {
                                  updateUsage(ingredient.id, { type: 'fraction', value: ingredient.quantity });
                                } else if (isCustom) {
                                  setCustomFractions((prev) => ({ ...prev, [ingredient.id]: { num: '', den: '' } }));
                                } else if (typeof choice.value === 'number') {
                                  selectFraction(ingredient, choice.value);
                                }
                              }}
                            >
                              {choice.label}
                            </button>
                          );
                        })}
                      </div>
                      {custom !== undefined && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                          <input
                            className="input"
                            type="number"
                            inputMode="numeric"
                            placeholder="分子"
                            style={{ width: 64, padding: '8px 10px', textAlign: 'center' }}
                            value={custom.num}
                            onChange={(e) => {
                              const num = e.target.value;
                              setCustomFractions((prev) => ({ ...prev, [ingredient.id]: { ...custom, num } }));
                              const n = Number(num);
                              const d = Number(custom.den);
                              if (n > 0 && d > 0) selectFraction(ingredient, n / d);
                            }}
                          />
                          <span>／</span>
                          <input
                            className="input"
                            type="number"
                            inputMode="numeric"
                            placeholder="分母"
                            style={{ width: 64, padding: '8px 10px', textAlign: 'center' }}
                            value={custom.den}
                            onChange={(e) => {
                              const den = e.target.value;
                              setCustomFractions((prev) => ({ ...prev, [ingredient.id]: { ...custom, den } }));
                              const n = Number(custom.num);
                              const d = Number(den);
                              if (n > 0 && d > 0) selectFraction(ingredient, n / d);
                            }}
                          />
                          <span className="text-muted" style={{ fontSize: 13 }}>
                            使用
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
