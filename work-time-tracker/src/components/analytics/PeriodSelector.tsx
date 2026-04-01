import { useState, useRef, useEffect, useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  format,
} from 'date-fns';
import type { AnalyticsPeriod } from '../../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  period: AnalyticsPeriod;
  label: string;
  onPeriodChange: (p: AnalyticsPeriod) => void;
  onPrev: () => void;
  onNext: () => void;
  anchor: Date;
  onDateSelect: (d: Date) => void;
}

const periods: { key: AnalyticsPeriod; label: string }[] = [
  { key: 'day', label: '日' },
  { key: 'week', label: '周' },
  { key: 'month', label: '月' },
  { key: 'quarter', label: '季' },
  { key: 'year', label: '年' },
];

const WEEKDAY_HEADERS = ['一', '二', '三', '四', '五', '六', '日'];

export default function PeriodSelector({
  period,
  label,
  onPeriodChange,
  onPrev,
  onNext,
  anchor,
  onDateSelect,
}: Props) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewMonth, setViewMonth] = useState(anchor);
  const panelRef = useRef<HTMLDivElement>(null);

  // 同步 viewMonth 和 anchor
  useEffect(() => {
    setViewMonth(anchor);
  }, [anchor]);

  // 点击外部关闭日历
  useEffect(() => {
    if (!showCalendar) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalendar]);

  // 生成日历网格（周一起始，含前后填充日）
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [viewMonth]);

  const today = new Date();

  const handleDateClick = (d: Date) => {
    onDateSelect(d);
    setShowCalendar(false);
  };

  return (
    <div className="flex items-center justify-between">
      {/* Period tabs */}
      <div className="flex items-center gap-1 bg-gray-100/60 rounded-xl p-1">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => onPeriodChange(p.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              period === p.key
                ? 'bg-white shadow-sm text-gray-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2 relative">
        <button
          onClick={onPrev}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={16} className="text-gray-500" />
        </button>

        {/* 可点击的日期按钮 */}
        <button
          onClick={() => setShowCalendar((v) => !v)}
          className="text-sm font-medium text-gray-700 min-w-48 text-center px-2 py-1 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
        >
          {label}
        </button>

        <button
          onClick={onNext}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight size={16} className="text-gray-500" />
        </button>

        {/* 日历面板 */}
        {showCalendar && (
          <div
            ref={panelRef}
            className="absolute top-full mt-2 right-0 z-50 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 w-72"
          >
            {/* 月份翻页 */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setViewMonth((m) => subMonths(m, 1))}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft size={16} className="text-gray-500" />
              </button>
              <span className="text-sm font-semibold text-gray-700">
                {format(viewMonth, 'yyyy年 M月')}
              </span>
              <button
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight size={16} className="text-gray-500" />
              </button>
            </div>

            {/* 星期头 */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAY_HEADERS.map((w) => (
                <div
                  key={w}
                  className="text-center text-[11px] text-gray-400 font-medium py-1"
                >
                  {w}
                </div>
              ))}
            </div>

            {/* 日期网格 */}
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((d, i) => {
                const isCurrentMonth = isSameMonth(d, viewMonth);
                const isToday = isSameDay(d, today);
                const isSelected = isSameDay(d, anchor);

                return (
                  <button
                    key={i}
                    onClick={() => handleDateClick(d)}
                    className={`
                      w-8 h-8 rounded-lg text-xs flex items-center justify-center transition-all
                      ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100'}
                      ${isToday && !isSelected ? 'ring-1 ring-blue-400 font-semibold text-blue-600' : ''}
                      ${isSelected ? 'bg-blue-500 text-white font-semibold hover:bg-blue-600' : ''}
                    `}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            {/* 跳转到今天 */}
            <button
              onClick={() => {
                onDateSelect(new Date());
                setShowCalendar(false);
              }}
              className="mt-3 w-full text-center text-xs text-blue-500 hover:text-blue-600 py-1.5 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              跳转到今天
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
