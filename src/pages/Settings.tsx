import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Settings as SettingsIcon } from 'lucide-react';
import { Header } from '../components/Header';
import { getSettings, updateMonthlyBudget } from '../repositories/settingsRepo';
import { useToast } from '../components/ToastProvider';
import { notifyDataChanged } from '../utils/bus';
import { toUserMessage } from '../utils/errors';

export function Settings() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [budget, setBudget] = useState('15000');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => setBudget(String(s.monthlyBudget)))
      .catch((e) => showToast(toUserMessage(e, '設定の読み込みに失敗しました')));
  }, [showToast]);

  async function handleSave() {
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
            <SettingsIcon size={16} /> 月の食費予算
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
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            保存
          </button>
        </div>
        <div className="card">
          <div className="section-title">食事区分</div>
          <p className="text-muted" style={{ fontSize: 13 }}>朝食・昼食・夕食・間食の4区分で固定されています。</p>
        </div>
      </div>
    </>
  );
}
