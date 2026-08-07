import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cellsOfMonth, formatMonthLabel, todayDateStr } from '../utils/date';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

interface MonthCalendarCardProps {
  ym: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  recordedDates: Set<string>;
  expiryDates: Set<string>;
}

// 月間カレンダーの月ナビ＋グリッド表示。Home / CalendarPage で共通利用する見た目のみのコンポーネント
export function MonthCalendarCard({
  ym,
  onPrevMonth,
  onNextMonth,
  selectedDate,
  onSelectDate,
  recordedDates,
  expiryDates,
}: MonthCalendarCardProps) {
  const cells = cellsOfMonth(ym);
  const today = todayDateStr();

  return (
    <div className="card mb-16">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button className="icon-btn" onClick={onPrevMonth} aria-label="前の月">
          <ChevronLeft size={18} />
        </button>
        <strong>{formatMonthLabel(ym)}</strong>
        <button className="icon-btn" onClick={onNextMonth} aria-label="次の月">
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="calendar-grid">
        {WEEKDAYS.map((w) => (
          <div className="calendar-weekday" key={w}>
            {w}
          </div>
        ))}
        {cells.map((c, idx) => {
          if (!c.date) return <div key={idx} />;
          const isToday = c.date === today;
          const isSelected = c.date === selectedDate;
          const hasRecord = recordedDates.has(c.date);
          const hasExpiry = expiryDates.has(c.date);
          return (
            <button
              key={c.date}
              className={`calendar-cell${isToday ? ' today' : ''}${isSelected && !isToday ? ' selected' : ''}`}
              onClick={() => onSelectDate(c.date!)}
            >
              {Number(c.date.slice(-2))}
              <span style={{ display: 'flex', gap: 3, height: 5 }}>
                {hasRecord && <span className="calendar-dot" />}
                {hasExpiry && <span className="calendar-dot expiry" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
