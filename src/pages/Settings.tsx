import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Settings as SettingsIcon } from 'lucide-react';
import { Header } from '../components/Header';
import {
  getSettings,
  updateMonthlyBudget,
  updateBudgetStartDay,
  updateMealTrackingEnabled,
} from '../repositories/settingsRepo';
import { useToast } from '../components/ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';

const START_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

export function Settings() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [budget, setBudget] = useState('15000');
  const [startDay, setStartDay] = useState(1);
  const [mealTrackingEnabled, setMealTrackingEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setBudget(String(s.monthlyBudget));
        setStartDay(s.budgetStartDay ?? 1);
        setMealTrackingEnabled(s.mealTrackingEnabled ?? true);
      })
      .catch((e) => showToast(toUserMessage(e, '設定の読み込みに失敗しました')));
  }, [showToast]);

  async function handleToggleMealTracking(enabled: boolean) {
    setMealTrackingEnabled(enabled);
    try {
      await updateMealTrackingEnabled(enabled);
      notifyDataChanged();
      showToast('保存しました');
    } catch (e) {
      showToast(toUserMessage(e, '保存に失敗しました'));
    }
  }

  async function handleSaveBudget() {
    const value = Number(budget);
    if (budget.trim() === '' || Number.isNaN(value) || value < 0) {
      showToast('正しい金額を入力してください');
      return;
    }
    setSaving(true);
    try {
      await updateMonthlyBudget(value);
      notifyDataChanged();
      showToast('保存しました');
    } catch (e) {
      showToast(toUserMessage(e, '保存に失敗しました'));
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeStartDay(day: number) {
    setStartDay(day);
    try {
      await updateBudgetStartDay(day);
      notifyDataChanged();
      showToast('保存しました');
    } catch (e) {
      showToast(toUserMessage(e, '保存に失敗しました'));
    }
  }

  return (
    <>
      <Header
        icon={
          <button className="icon-btn" onClick={() => navigate(-1)} style={{ padding: 0 }} aria-label="戻る">
            <ChevronLeft size={22} />
          </button>
        }
        title="設定"
      />
      <div className="page-content">
        <div className="card mb-16">
          <div className="section-title">
            <SettingsIcon size={16} /> 食費の予算
          </div>
          <div className="field">
            <label>予算金額</label>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleSaveBudget} disabled={saving}>
            保存
          </button>
        </div>

        <div className="card mb-16">
          <div className="section-title">食費の集計開始日</div>
          <p className="text-muted mb-16" style={{ fontSize: 13 }}>
            毎月この日から翌月の前日までを1期間として集計します。
          </p>
          <div className="field">
            <label>開始日</label>
            <select
              className="select"
              value={startDay}
              onChange={(e) => handleChangeStartDay(Number(e.target.value))}
            >
              {START_DAY_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}日
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card mb-16">
          <div className="section-title">食事管理</div>
          <p className="text-muted mb-16" style={{ fontSize: 13 }}>
            食べたものを記録・管理します。OFFにすると「今日のごはん」などの食事記録機能が隠れ、在庫・期限・調理済み料理の管理を中心に使えます。
          </p>
          <div className="chip-row">
            <button
              className={`chip${mealTrackingEnabled ? ' active' : ''}`}
              onClick={() => handleToggleMealTracking(true)}
            >
              ON
            </button>
            <button
              className={`chip${!mealTrackingEnabled ? ' active' : ''}`}
              onClick={() => handleToggleMealTracking(false)}
            >
              OFF
            </button>
          </div>
        </div>

        <div className="card">
          <div className="section-title">食事区分</div>
          <p className="text-muted" style={{ fontSize: 13 }}>朝食・昼食・夕食・間食の4区分で固定されています。</p>
        </div>
      </div>
    </>
  );
}
