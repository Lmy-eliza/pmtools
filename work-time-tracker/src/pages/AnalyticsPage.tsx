import { useState, useEffect, useMemo, useRef } from 'react';
import {
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addYears,
  subYears,
  differenceInWeeks,
  getDate,
  getMonth,
  getDay,
  parseISO,
  startOfWeek,
  startOfYear,
  eachDayOfInterval,
} from 'date-fns';
import type {
  AnalyticsPeriod,
  DailyStats,
  TagStats,
  HeatMapCell,
  HeatMapColumn,
  TimeBlock,
  DailyNote,
  Todo,
  YearHeatMapCell,
  MonthCalendarCell,
  MoodLog,
} from '../types';
import { useTimeBlockStore } from '../stores/timeBlockStore';
import { useNoteStore } from '../stores/noteStore';
import { useMoodLogStore } from '../stores/moodLogStore';
import { useTagStore } from '../stores/tagStore';
import { useSettingsStore } from '../stores/settingsStore';
import { feishuApi } from '../services/feishuApi';
import PeriodSelector from '../components/analytics/PeriodSelector';
import HeatMap from '../components/analytics/HeatMap';
import HeatMapYear from '../components/analytics/HeatMapYear';
import TagPieChart from '../components/analytics/TagPieChart';
import MoodTrendChart from '../components/analytics/MoodTrendChart';
import SummaryCard from '../components/analytics/SummaryCard';
import NoteHistorySection from '../components/analytics/NoteHistorySection';
import FloatingNav from '../components/analytics/FloatingNav';
import {
  formatDate,
  getDayRange,
  getWeekRange,
  getMonthRange,
  getQuarterRange,
  getYearRange,
  getDaysInRange,
  getWeekNumber,
  dateToTimestamp,
  dateToTimestampRange,
  getWeekdayName,
  ensureDateStr,
} from '../utils/dateUtils';
import { timeToMinutes } from '../utils/timeUtils';
import { generateReport } from '../utils/reportGenerator';
import { format } from 'date-fns';

const DAYS_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>(() => {
    return (sessionStorage.getItem('wtt-analytics-period') as AnalyticsPeriod) || 'week';
  });
  const [anchor, setAnchor] = useState(() => {
    const saved = sessionStorage.getItem('wtt-analytics-anchor');
    return saved ? new Date(saved) : new Date();
  });
  const { isConfigured } = useSettingsStore();

  // 记住统计页的周期和日期选择
  useEffect(() => {
    sessionStorage.setItem('wtt-analytics-period', period);
    sessionStorage.setItem('wtt-analytics-anchor', anchor.toISOString());
  }, [period, anchor]);
  const { fetchBlocksRange } = useTimeBlockStore();
  const { fetchNotesRange } = useNoteStore();
  const { fetchLogsRange } = useMoodLogStore();
  const { tags } = useTagStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [rangeTodos, setRangeTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  // #28: report copied feedback
  const [reportCopied, setReportCopied] = useState(false);

  // Compute date range
  const range = useMemo(() => {
    switch (period) {
      case 'day':
        return getDayRange(anchor);
      case 'week':
        return getWeekRange(anchor);
      case 'month':
        return getMonthRange(anchor);
      case 'quarter':
        return getQuarterRange(anchor);
      case 'year':
        return getYearRange(anchor);
    }
  }, [period, anchor]);

  const rangeLabel = useMemo(() => {
    const s = formatDate(range.start);
    const e = formatDate(range.end);
    switch (period) {
      case 'day':
        return `${format(anchor, 'yyyy-MM-dd')} ${getWeekdayName(anchor)}`;
      case 'week':
        return `${format(anchor, 'yyyy')}年 第${getWeekNumber(anchor)}周 (${s.slice(5)} - ${e.slice(5)})`;
      case 'month':
        return format(anchor, 'yyyy年 M月');
      case 'quarter':
        return `${format(anchor, 'yyyy')}年 Q${Math.ceil((anchor.getMonth() + 1) / 3)}`;
      case 'year':
        return format(anchor, 'yyyy年');
    }
  }, [period, anchor, range]);

  // Fetch data（包含 moodLog）
  useEffect(() => {
    if (!isConfigured) return;
    setLoading(true);
    const s = formatDate(range.start);
    const e = formatDate(range.end);
    Promise.all([
      fetchBlocksRange(s, e),
      fetchNotesRange(s, e),
      fetchLogsRange(s, e),
      feishuApi.listRecords<Todo>('todo', {
        filter: `CurrentValue.[date] >= ${dateToTimestamp(s)} && CurrentValue.[date] < ${dateToTimestampRange(e).endTs}`,
      }),
    ])
      .then(([b, n, ml, t]) => {
        setBlocks(b);
        setNotes(n);
        setMoodLogs(ml);
        setRangeTodos(t);
      })
      .finally(() => setLoading(false));
  }, [range, isConfigured]);

  // Navigate
  const navigate = (dir: 1 | -1) => {
    switch (period) {
      case 'day':
        setAnchor((a) => (dir === 1 ? addDays(a, 1) : subDays(a, 1)));
        break;
      case 'week':
        setAnchor((a) => (dir === 1 ? addWeeks(a, 1) : subWeeks(a, 1)));
        break;
      case 'month':
        setAnchor((a) => (dir === 1 ? addMonths(a, 1) : subMonths(a, 1)));
        break;
      case 'quarter':
        setAnchor((a) => (dir === 1 ? addMonths(a, 3) : subMonths(a, 3)));
        break;
      case 'year':
        setAnchor((a) => (dir === 1 ? addYears(a, 1) : subYears(a, 1)));
        break;
    }
  };

  // Compute stats
  const days = getDaysInRange(range.start, range.end);

  const dailyStats: DailyStats[] = useMemo(() => {
    return days.map((day) => {
      const ds = formatDate(day);
      const dayBlocks = blocks.filter((b) => b.date === ds);
      return {
        date: ds,
        totalMinutes: dayBlocks.reduce((s, b) => s + b.duration_minutes, 0),
        completedTodos: 0,
        totalTodos: 0,
      };
    });
  }, [days, blocks]);

  // 心情数据（从 moodLogStore 计算日均分）
  const moodData = useMemo(() => {
    const dateMap = new Map<string, { totalScore: number; count: number; emoji: string }>();
    for (const log of moodLogs) {
      const d = ensureDateStr(log.date);
      const existing = dateMap.get(d);
      if (existing) {
        existing.totalScore += log.score;
        existing.count += 1;
        existing.emoji = log.emoji; // 取最后一条的 emoji
      } else {
        dateMap.set(d, { totalScore: log.score, count: 1, emoji: log.emoji });
      }
    }
    return Array.from(dateMap.entries()).map(([date, v]) => ({
      date,
      avgScore: +(v.totalScore / v.count).toFixed(1),
      emoji: v.emoji,
    }));
  }, [moodLogs]);

  const tagStats: TagStats[] = useMemo(() => {
    const map = new Map<string, { minutes: number; tag_name: string; emoji: string; color: string }>();
    for (const b of blocks) {
      const key = b.tag_id || b.tag_name;
      const existing = map.get(key);
      if (existing) {
        existing.minutes += b.duration_minutes;
      } else {
        const tag = tags.find((t) => t.id === b.tag_id);
        map.set(key, {
          minutes: b.duration_minutes,
          tag_name: b.tag_name || '未分类',
          emoji: tag?.emoji || '📋',
          color: b.color || '#6B7280',
        });
      }
    }
    const total = blocks.reduce((s, b) => s + b.duration_minutes, 0);
    return Array.from(map.entries()).map(([id, v]) => ({
      tag_id: id,
      tag_name: v.tag_name,
      emoji: v.emoji,
      color: v.color,
      totalMinutes: v.minutes,
      percentage: total > 0 ? (v.minutes / total) * 100 : 0,
    })).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [blocks, tags]);

  // HeatMap columns based on period
  const heatMapColumns: HeatMapColumn[] = useMemo(() => {
    switch (period) {
      // #11: Day view - 2 rows: AM / PM
      case 'day':
        return [
          { key: 0, label: '上午' },
          { key: 1, label: '下午' },
        ];
      case 'week':
        return DAYS_LABELS.map((d, i) => ({ key: i === 6 ? 0 : i + 1, label: d }));
      case 'month': {
        const daysInMonth = getDaysInRange(range.start, range.end);
        return daysInMonth.map((d, i) => ({ key: i, label: String(getDate(d)) }));
      }
      // #10: Quarter view - 3 rows by month instead of weeks
      case 'quarter': {
        const startMonth = range.start.getMonth();
        const cols: HeatMapColumn[] = [];
        for (let m = 0; m < 3; m++) {
          cols.push({ key: m, label: MONTH_LABELS[startMonth + m] });
        }
        return cols;
      }
      case 'year':
        return MONTH_LABELS.map((label, i) => ({ key: i, label }));
    }
  }, [period, anchor, range]);

  // HeatMap data based on period
  const heatMapData: HeatMapCell[] = useMemo(() => {
    const grid = new Map<string, number>();

    for (const b of blocks) {
      const blockDate = parseISO(b.date);
      const startH = parseInt(b.start_time.split(':')[0]);
      const endH = parseInt(b.end_time.split(':')[0]);

      let dayKey: number;
      switch (period) {
        // #11: Day view: AM=0, PM=1
        case 'day':
          // We'll iterate hours and assign per-hour
          break;
        case 'week':
          dayKey = blockDate.getDay();
          break;
        case 'month':
          dayKey = getDate(blockDate) - 1;
          break;
        // #10: Quarter view: group by month offset
        case 'quarter': {
          dayKey = blockDate.getMonth() - range.start.getMonth();
          break;
        }
        case 'year':
          dayKey = getMonth(blockDate);
          break;
      }

      if (period === 'day') {
        // #11: For day view, dayKey = 0 (AM) or 1 (PM) per hour
        for (let h = startH; h <= endH; h++) {
          const amPm = h < 12 ? 0 : 1;
          const key = `${amPm}-${h}`;
          const startMin = h === startH ? parseInt(b.start_time.split(':')[1]) : 0;
          const endMin = h === endH ? parseInt(b.end_time.split(':')[1]) : 60;
          grid.set(key, (grid.get(key) || 0) + (endMin - startMin));
        }
      } else {
        for (let h = startH; h <= endH; h++) {
          const key = `${dayKey!}-${h}`;
          const startMin = h === startH ? parseInt(b.start_time.split(':')[1]) : 0;
          const endMin = h === endH ? parseInt(b.end_time.split(':')[1]) : 60;
          grid.set(key, (grid.get(key) || 0) + (endMin - startMin));
        }
      }
    }

    return Array.from(grid.entries()).map(([key, mins]) => {
      const [day, hour] = key.split('-').map(Number);
      return { day, hour, minutes: mins };
    });
  }, [blocks, period, range]);

  // Month calendar data
  const monthCalendarData: MonthCalendarCell[] = useMemo(() => {
    if (period !== 'month') return [];
    const daysInMonth = getDaysInRange(range.start, range.end);
    const monthStart = startOfWeek(range.start, { weekStartsOn: 1 });

    return daysInMonth.map((day) => {
      const ds = formatDate(day);
      const dayBlocks = blocks.filter((b) => b.date === ds);
      const totalMins = dayBlocks.reduce((s, b) => s + b.duration_minutes, 0);
      const jsDay = getDay(day);
      const weekday = jsDay === 0 ? 6 : jsDay - 1;
      const weekIndex = Math.floor(differenceInWeeks(day, monthStart));
      return {
        date: ds,
        weekIndex,
        weekday,
        totalMinutes: totalMins,
      };
    });
  }, [period, range, blocks]);

  // Year heatmap data
  const yearHeatMapData: YearHeatMapCell[] = useMemo(() => {
    if (period !== 'year') return [];
    const yearStart = range.start;
    const yearStartWeekStart = startOfWeek(yearStart, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start: range.start, end: range.end });

    const dailyTotals = new Map<string, number>();
    for (const b of blocks) {
      dailyTotals.set(b.date, (dailyTotals.get(b.date) || 0) + b.duration_minutes);
    }

    return allDays.map((day) => {
      const ds = formatDate(day);
      const jsDay = getDay(day);
      const weekday = jsDay === 0 ? 6 : jsDay - 1;
      const weekIndex = Math.floor((day.getTime() - yearStartWeekStart.getTime()) / (7 * 86400000));
      return {
        date: ds,
        weekday,
        weekIndex,
        totalMinutes: dailyTotals.get(ds) || 0,
      };
    });
  }, [period, range, blocks]);

  // Dynamic hour range
  const { startHour: dynamicStartHour, endHour: dynamicEndHour } = useMemo(() => {
    let minH = 8, maxH = 18;
    for (const b of blocks) {
      const sH = parseInt(b.start_time.split(':')[0]);
      const eH = parseInt(b.end_time.split(':')[0]);
      if (sH < minH) minH = sH;
      if (eH > maxH) maxH = eH;
    }
    return { startHour: minH, endHour: maxH };
  }, [blocks]);

  // Summary
  const totalMinutes = dailyStats.reduce((s, d) => s + d.totalMinutes, 0);
  const daysWithData = dailyStats.filter((d) => d.totalMinutes > 0);
  const avgMinutesPerDay = daysWithData.length > 0 ? totalMinutes / daysWithData.length : 0;

  const busiestDay = dailyStats.length > 0
    ? dailyStats.reduce((a, b) => (a.totalMinutes > b.totalMinutes ? a : b))
    : null;
  const quietestDay = dailyStats.length > 0
    ? dailyStats.reduce((a, b) => (a.totalMinutes < b.totalMinutes ? a : b))
    : null;

  // Peak hour
  const hourMap = new Map<number, number>();
  for (const b of blocks) {
    const h = parseInt(b.start_time.split(':')[0]);
    hourMap.set(h, (hourMap.get(h) || 0) + b.duration_minutes);
  }
  let peakHour: number | null = null;
  let peakMin = 0;
  for (const [h, m] of hourMap) {
    if (m > peakMin) {
      peakMin = m;
      peakHour = h;
    }
  }

  // Avg mood（从 moodLog 计算）
  const avgMood = moodData.length > 0
    ? moodData.reduce((s, m) => s + m.avgScore, 0) / moodData.length
    : null;

  // #28: Generate report
  const handleGenerateReport = async () => {
    const report = generateReport({
      blocks,
      todos: rangeTodos,
      period,
      rangeLabel,
      dateStr: period === 'day' ? formatDate(anchor) : undefined,
    });
    try {
      await navigator.clipboard.writeText(report);
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 3000);
    } catch {
      // Fallback: select text
      const textarea = document.createElement('textarea');
      textarea.value = report;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 3000);
    }
  };

  // 悬浮导航项：与实际图表一一绑定
  const navItems = useMemo(() => {
    return [
      { id: 'section-heatmap', emoji: '🔥', label: '热力图' },
      { id: 'section-summary', emoji: '📋', label: '汇总' },
      { id: 'section-tags', emoji: '🏷️', label: '标签' },
      { id: 'section-mood', emoji: '😊', label: '心情' },
      { id: 'section-notes', emoji: '📖', label: '随笔' },
    ];
  }, []);

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            请先配置飞书连接
          </h2>
          <p className="text-gray-400 text-sm">前往设置页面配置后查看统计数据</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6 pr-16">
        {/* Period selector + report button */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <PeriodSelector
              period={period}
              label={rangeLabel}
              onPeriodChange={setPeriod}
              onPrev={() => navigate(-1)}
              onNext={() => navigate(1)}
              anchor={anchor}
              onDateSelect={setAnchor}
            />
          </div>
          {/* #28: Generate report button */}
          <button
            onClick={handleGenerateReport}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              reportCopied
                ? 'bg-green-50 text-green-600 border border-green-200'
                : 'bg-white/60 text-gray-600 border border-gray-200 hover:bg-white/80'
            }`}
          >
            {reportCopied ? (
              <>已复制到剪贴板</>
            ) : (
              <>生成报告</>
            )}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3 animate-pulse">📊</div>
            加载中...
          </div>
        ) : (
          <>
            {/* === Row1: 热力图（所有视图独占整行）=== */}
            <div id="section-heatmap">
              {period === 'year' ? (
                <HeatMapYear data={yearHeatMapData} />
              ) : (
                <HeatMap
                  data={heatMapData}
                  period={period}
                  columns={heatMapColumns}
                  startHour={dynamicStartHour}
                  endHour={dynamicEndHour}
                  monthCalendarData={period === 'month' ? monthCalendarData : undefined}
                />
              )}
            </div>

            {/* === Row2: 汇总(左) + 标签工时(右) === */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <div id="section-summary">
                <SummaryCard
                  totalMinutes={totalMinutes}
                  avgMinutesPerDay={avgMinutesPerDay}
                  busiestDay={
                    busiestDay ? { date: busiestDay.date, minutes: busiestDay.totalMinutes } : null
                  }
                  quietestDay={
                    quietestDay ? { date: quietestDay.date, minutes: quietestDay.totalMinutes } : null
                  }
                  completedTodos={rangeTodos.filter(t => t.status === 'completed').length}
                  totalTodos={rangeTodos.length}
                  peakHour={peakHour}
                  avgMood={avgMood}
                />
              </div>
              <div id="section-tags">
                <TagPieChart data={tagStats} />
              </div>
            </div>

            {/* === Row3: 心情×工时（独占整行）=== */}
            <div id="section-mood">
              <MoodTrendChart
                data={dailyStats}
                period={period}
                hourlyData={period === 'day' ? heatMapData : undefined}
                startHour={dynamicStartHour}
                endHour={dynamicEndHour}
                moodData={moodData}
              />
            </div>

            {/* === Row4: 随笔（独占整行）=== */}
            <div id="section-notes">
              <NoteHistorySection
                notes={notes}
                defaultStart={formatDate(range.start)}
                defaultEnd={formatDate(range.end)}
              />
            </div>
          </>
        )}
      </div>

      {/* Floating navigation */}
      {!loading && <FloatingNav items={navItems} scrollContainer={scrollRef.current} />}
    </div>
  );
}
