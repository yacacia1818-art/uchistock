import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Header } from '../components/Header';
import { MonthCalendarCard } from '../components/MonthCalendarCard';
import { DayRecordDetail } from '../components/DayRecordDetail';
import { getSettings } from '../repositories/settingsRepo';
import { addMonths, currentYearMonth, todayDateStr } from '../utils/date';
import { useDataVersion } from '../hooks/useDataVersion';
import { useMonthCalendarData } from '../hooks/useMonthCalendarData';
import { useToast } from '../components/ToastProvider';
import { toUserMessage } from '../utils/errors';

// 過去の購入・食事・調理記録を日付から振り返るためのページ。
// 予算サマリーや期限一覧はホーム画面と重複するため、ここでは扱わない。
export function CalendarPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const version = useDataVersion();
  const [ym, setYm] = useState(currentYearMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr());
  const [mealTrackingEnabled, setMealTrackingEnabled] = useState(true);

  const { meals, purchases, cookedDishes, recordedDates, expiryByDate } = useMonthCalendarData(ym, version, (e) =>
    showToast(toUserMessage(e, 'データの読み込みに失敗しました'))
  );

  useEffect(() => {
    getSettings()
      .then((s) => setMealTrackingEnabled(s.mealTrackingEnabled ?? true))
      .catch((e) => showToast(toUserMessage(e, 'データの読み込みに失敗しました')));
  }, [version, showToast]);

  const dayExpiring = expiryByDate.get(selectedDate) ?? [];
  const expiryDates = new Set(expiryByDate.keys());

  return (
    <>
      <Header
        icon={
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label="戻る" style={{ padding: 0 }}>
            <ChevronLeft size={22} />
          </button>
        }
        title="カレンダー"
        subtitle="過去の記録をふりかえる"
      />
      <div className="page-content">
        <MonthCalendarCard
          ym={ym}
          onPrevMonth={() => setYm((prev) => addMonths(prev, -1))}
          onNextMonth={() => setYm((prev) => addMonths(prev, 1))}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          recordedDates={recordedDates}
          expiryDates={expiryDates}
        />

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
