import { useEffect, useState } from 'react';
import { ClipboardList, Plus, Sun, Moon, Cookie } from 'lucide-react';
import { Header } from '../components/Header';
import { MealFormSheet } from '../components/MealFormSheet';
import { CookingFormSheet } from '../components/CookingFormSheet';
import { PurchaseFormSheet } from '../components/PurchaseFormSheet';
import { MealDetailSheet } from '../components/MealDetailSheet';
import { CookingDetailSheet } from '../components/CookingDetailSheet';
import { RecordTypeChooserSheet, type RecordChoice } from '../components/RecordTypeChooserSheet';
import { listMeals } from '../repositories/mealRepo';
import { listCookedDishes } from '../repositories/cookedDishRepo';
import { getSettings } from '../repositories/settingsRepo';
import { useDataVersion } from '../hooks/useDataVersion';
import { useToast } from '../components/ToastProvider';
import { toUserMessage } from '../utils/errors';
import { formatDateLabel } from '../utils/date';
import { formatQuantity } from '../utils/quantity';
import { mealContentLabel, mealSubLabel } from '../utils/mealDisplay';
import type { CookedDish, Meal } from '../types';

const MEAL_ICON = { 朝食: Sun, 昼食: Sun, 夕食: Moon, 間食: Cookie } as const;

type RecordsTab = 'meals' | 'cooking';

export function Records() {
  const { showToast } = useToast();
  const version = useDataVersion();
  const [tab, setTab] = useState<RecordsTab>('meals');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [cookedDishes, setCookedDishes] = useState<CookedDish[]>([]);
  const [mealTrackingEnabled, setMealTrackingEnabled] = useState(true);
  const [showChooser, setShowChooser] = useState(false);
  const [showMealForm, setShowMealForm] = useState(false);
  const [showCookingForm, setShowCookingForm] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [selectedDish, setSelectedDish] = useState<CookedDish | null>(null);
  const [editingDish, setEditingDish] = useState<CookedDish | null>(null);

  useEffect(() => {
    Promise.all([listMeals(), listCookedDishes(), getSettings()])
      .then(([m, c, s]) => {
        setMeals(m);
        setCookedDishes(c);
        const enabled = s.mealTrackingEnabled ?? true;
        setMealTrackingEnabled(enabled);
        setTab((prev) => (!enabled && prev === 'meals' ? 'cooking' : prev));
      })
      .catch((e) => showToast(toUserMessage(e, 'データの読み込みに失敗しました')));
  }, [version, showToast]);

  function handleChoose(choice: RecordChoice) {
    setShowChooser(false);
    if (choice === 'meal') setShowMealForm(true);
    else if (choice === 'cooking') setShowCookingForm(true);
    else setShowPurchaseForm(true);
  }

  return (
    <>
      <Header
        icon={<ClipboardList size={20} />}
        title="記録"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowChooser(true)}>
            <Plus size={16} /> 記録
          </button>
        }
      />
      <div className="page-content">
        <div className="tabs">
          {mealTrackingEnabled && (
            <button className={`tab${tab === 'meals' ? ' active' : ''}`} onClick={() => setTab('meals')}>
              食事
            </button>
          )}
          <button className={`tab${tab === 'cooking' ? ' active' : ''}`} onClick={() => setTab('cooking')}>
            調理
          </button>
        </div>

        {tab === 'meals' && mealTrackingEnabled && (
          <div className="card">
            {meals.length === 0 ? (
              <div className="empty-state">まだ食事記録がありません</div>
            ) : (
              meals.map((m) => {
                const Icon = MEAL_ICON[m.mealType];
                const sub = mealSubLabel(m);
                return (
                  <button
                    key={m.id}
                    className="list-row"
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', font: 'inherit' }}
                    onClick={() => setSelectedMeal(m)}
                  >
                    <div className="row-emoji">
                      <Icon size={18} />
                    </div>
                    <div className="row-main">
                      <div className="row-title">{mealContentLabel(m)}</div>
                      <div className="row-sub">
                        {formatDateLabel(m.date)} ・ {m.mealType}
                        {sub && ` ・ ${sub}`}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {tab === 'cooking' && (
          <div className="card">
            {cookedDishes.length === 0 ? (
              <div className="empty-state">まだ調理記録がありません</div>
            ) : (
              cookedDishes.map((dish) => (
                <button
                  key={dish.id}
                  className="list-row"
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    font: 'inherit',
                    alignItems: 'flex-start',
                  }}
                  onClick={() => setSelectedDish(dish)}
                >
                  <div className="row-emoji">🍳</div>
                  <div className="row-main">
                    <div className="row-title">{dish.name}</div>
                    <div className="row-sub">
                      {formatDateLabel(dish.date)} {dish.time}
                    </div>
                    {dish.ingredientUsages.length > 0 && (
                      <div className="row-sub mt-8">
                        使用食材：
                        {dish.ingredientUsages
                          .map((u) => `${u.ingredientName} ${formatQuantity(u.usage.value, u.unit)}`)
                          .join('・')}
                      </div>
                    )}
                    {dish.servings !== undefined && (
                      <div className="row-sub">
                        完成量：{dish.servings}食分
                        {dish.servingsRemaining !== undefined && `（残り${dish.servingsRemaining}食）`}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {showChooser && (
        <RecordTypeChooserSheet
          onClose={() => setShowChooser(false)}
          onChoose={handleChoose}
          mealTrackingEnabled={mealTrackingEnabled}
        />
      )}
      {showMealForm && mealTrackingEnabled && <MealFormSheet onClose={() => setShowMealForm(false)} />}
      {showCookingForm && <CookingFormSheet onClose={() => setShowCookingForm(false)} />}
      {showPurchaseForm && <PurchaseFormSheet onClose={() => setShowPurchaseForm(false)} />}

      {selectedMeal && (
        <MealDetailSheet
          meal={selectedMeal}
          onClose={() => setSelectedMeal(null)}
          onEdit={() => {
            setEditingMeal(selectedMeal);
            setSelectedMeal(null);
          }}
        />
      )}
      {editingMeal && (
        <MealFormSheet key={editingMeal.id} editingMeal={editingMeal} onClose={() => setEditingMeal(null)} />
      )}

      {selectedDish && (
        <CookingDetailSheet
          dish={selectedDish}
          onClose={() => setSelectedDish(null)}
          onEdit={() => {
            setEditingDish(selectedDish);
            setSelectedDish(null);
          }}
        />
      )}
      {editingDish && (
        <CookingFormSheet key={editingDish.id} editingDish={editingDish} onClose={() => setEditingDish(null)} />
      )}
    </>
  );
}
