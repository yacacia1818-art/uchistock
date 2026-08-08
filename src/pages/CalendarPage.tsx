import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Header } from '../components/Header';
import { MonthCalendarCard } from '../components/MonthCalendarCard';
import { DayRecordDetail } from '../components/DayRecordDetail';
import { getSettings } from '../repositories/settingsRepo';
import { getPeriodCost } from '../services/foodCost';
import { listExpiringIngredients, type ExpiringIngredient } from '../services/expirySummary';
import { getCurrentPeriod, formatPeriodRangeLabel } from '../utils/period';
import { formatExpiryRelative } from '../utils/expiry';
import { addMonths, currentYearMonth, todayDateStr } from '../utils/date';
import { useDataVersion } from '../hooks/useDataVersion';
import { useMonthCalendarData } from '../hooks/useMonthCalendarData';
import { useToast } from '../components/ToastProvider';
import { toUserMessage } from '../utils/errors';
import { formatQuantity } from '../utils/quantity';

export function CalendarPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const version = useDataVersion();
  const [ym, setYm] = useState(currentYearMonth());
  const [expiringList, setExpiringList] = useState<ExpiringIngredient[]>([]);
  const [budget, setBudget] = useState(15000);
  const [periodUsed, setPeriodUsed] = useState(0);
  const [periodLabel, setPeriodLabel] = useState('');
  const [mealTrackingEnabled, setMealTrackingEnabled] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr());

  const { meals, purchases, cookedDishes, recordedDates, expiryByDate } = useMonthCalendarData(ym, version, (e) =>
    showToast(toUserMessage(e, 'データの読み込みに失敗しました'))
  );

  useEffect(() => {
    Promise.all([getSettings(), listExpiringIngredients()])
      .then(async ([s, expiring]) => {
        setExpiringList(expiring);
        setBudget(s.monthlyBudget);
        setMealTrackingEnabled(s.mealTrackingEnabled ?? true);
        const period = getCurrentPeriod(s.budgetStartDay);
        setPeriodLabel(formatPeriodRangeLabel(period));
        const cost = await getPeriodCost(period);
        setPeriodUsed(cost.used);
      })
      .catch((e) => showToast(toUserMessage(e, 'データの読み込みに失敗しました')));
  }, [version, showToast]);

  const remaining = budget - periodUsed;
  const dayExpiring = expiryByDate.get(selectedDate) ?? [];
  const expiryDates = new Set(expiryByDate.keys());

  return (
    <>
      <Header icon={<CalendarIcon size={20} />} title="カレンダー" />
      <div className="page-content">
        <div className="card mb-16">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span>
              使用額 <strong>¥{periodUsed.toLocaleString()}</strong>
            </span>
            <span>
              残り予算 <strong>¥{remaining.toLocaleString()}</strong>
            </span>
          </div>
          {periodLabel && (
            <div className="text-muted mt-8" style={{ fontSize: 12 }}>
              集計期間：{periodLabel}
            </div>
          )}
        </div>

        <MonthCalendarCard
          ym={ym}
          onPrevMonth={() => setYm((prev) => addMonths(prev, -1))}
          onNextMonth={() => setYm((prev) => addMonths(prev, 1))}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          recordedDates={recordedDates}
          expiryDates={expiryDates}
        />

        <div className="card mb-16">
          <div className="section-title">⏰ 期限が近い食材</div>
          {expiringList.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13 }}>
              期限が設定された食材はありません
            </p>
          ) : (
            expiringList.map(({ ingredient, days }) => (
              <button
                key={ingredient.id}
                className="link-row"
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', font: 'inherit' }}
                onClick={() => navigate('/ingredients')}
              >
                <span
                  className={days <= 0 ? '' : 'text-muted'}
                  style={{ fontWeight: 700, color: days <= 0 ? 'var(--color-danger)' : undefined }}
                >
                  {formatExpiryRelative(days)}
                </span>
                <span>
                  {ingredient.name}　{formatQuantity(ingredient.quantity, ingredient.unit)}
                </span>
              </button>
            ))
          )}
        </div>

        <DayRecordDetail
          selectedDate={selectedDate}
          meals={meals}
          purchases={purchases}
          cookedDishes={cookedDishes}
          expiringIngredients={dayExpiring}
          mealTrackingEnabled={mealTrackingEnabled}
        />
      </div>
    </>
  );
}
