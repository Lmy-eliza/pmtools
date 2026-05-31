import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
import { formatDisplayDate, prevDay, nextDay, isTodayDate } from '../../utils/dateUtils';

interface Props {
  date: Date;
  onChange: (date: Date) => void;
}

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

export default function DateNavigator({ date, onChange }: Props) {
  const isToday = isTodayDate(date);
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewMonth, setViewMonth] = useState(date);
  const panelRef = useRef<HTMLDivElement>(null);

  // 点击面板外关闭
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

  // 打开面板时同步到当前选中日期所在月份
  const toggleCalendar = () => {
    if (!showCalendar) {
      setViewMonth(date);
    }
    setShowCalendar(!showCalendar);
  };

  // 选择日期
  const handleSelectDay = (day: Date) => {
    onChange(day);
    setShowCalendar(false);
  };

  // 生成当月日历网格（周一起始）
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="relative" ref={panelRef}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(prevDay(date))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={16} className="text-gray-500" />
        </button>

        {/* 点击日期文字 → toggle 日历面板 */}
        <button
          onClick={toggleCalendar}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            isToday
              ? 'bg-blue-50 text-blue-600'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          {formatDisplayDate(date)}
        </button>

        <button
          onClick={() => onChange(nextDay(date))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight size={16} className="text-gray-500" />
        </button>

        {/* "今日" 快捷按钮 */}
        {!isToday && (
          <button
            onClick={() => onChange(new Date())}
            className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"
          >
            今日
          </button>
        )}
      </div>

      {/* 月历面板 */}
      {showCalendar && (
        <div className="absolute top-full right-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-gray-200/80 p-3 w-[280px]">
          {/* 月份导航 */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setViewMonth(subMonths(viewMonth, 1))}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={14} className="text-gray-500" />
            </button>
            <span className="text-sm font-semibold text-gray-700">
              {format(viewMonth, 'yyyy年 M月')}
            </span>
            <button
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight size={14} className="text-gray-500" />
            </button>
          </div>

          {/* 星期表头 */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-[11px] text-gray-400 font-medium py-1"
              >
                {label}
              </div>
            ))}
          </div>

          {/* 日期网格 */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day) => {
              const isSelected = isSameDay(day, date);
              const isTodayCell = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, viewMonth);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleSelectDay(day)}
                  className={`relative w-full aspect-square flex items-center justify-center rounded-lg text-xs transition-all
                    ${isSelected
                      ? 'bg-blue-500 text-white font-semibold shadow-sm'
                      : isTodayCell
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : isCurrentMonth
                          ? 'text-gray-700 hover:bg-gray-100'
                          : 'text-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {format(day, 'd')}
                  {/* 今天标记小圆点（选中状态下不显示） */}
                  {isTodayCell && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 快捷跳转：今日 */}
          <div className="mt-2 pt-2 border-t border-gray-100 flex justify-center">
            <button
              onClick={() => {
                onChange(new Date());
                setShowCalendar(false);
              }}
              className="text-xs text-blue-500 hover:text-blue-600 font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
            >
              跳转到今天
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
