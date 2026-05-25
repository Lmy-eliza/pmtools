import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { DailyStats, HeatMapCell, AnalyticsPeriod } from '../../types';
import { MOOD_OPTIONS } from '../../types';
import { getDayDualColor, getSlotColor } from './HeatMap';
import { startOfWeek, format } from 'date-fns';

// 心情数据独立传入（来自 moodLogStore）
interface MoodDataItem {
  date: string;
  avgScore: number;
  emoji?: string;
}

interface Props {
  data: DailyStats[];
  period?: AnalyticsPeriod;
  hourlyData?: HeatMapCell[];  // 日视图传入
  startHour?: number;
  endHour?: number;
  moodData?: MoodDataItem[];   // 心情数据（来自 moodLogStore 日均分）
}

export default function MoodTrendChart({ data, period, hourlyData, startHour = 8, endHour = 18, moodData }: Props) {
  // 日视图：X轴=工作时段小时，Y轴=分钟(0-60)
  if (period === 'day') {
    // 日视图的心情：从 moodData 取当天平均分
    const dayMoodItem = moodData && moodData.length > 0 ? moodData[0] : undefined;
    const dayMood = dayMoodItem?.avgScore;
    const dayMoodEmoji = dayMoodItem?.emoji;

    // 收集有数据的小时
    const hoursWithData = new Set<number>();
    for (const c of (hourlyData || [])) {
      if (c.minutes > 0) hoursWithData.add(c.hour);
    }

    // 基础时段 8-18，有数据则向两端扩展
    let minH = 8;
    let maxH = 18;
    for (const h of hoursWithData) {
      if (h < minH) minH = h;
      if (h > maxH) maxH = h;
    }

    // 生成完整小时数组（无数据=0 min）
    const chartData: { label: string; hour: number; minutes: number }[] = [];
    for (let h = minH; h <= maxH; h++) {
      const cell = hourlyData?.find(c => c.hour === h);
      chartData.push({ label: `${h}:00`, hour: h, minutes: cell?.minutes || 0 });
    }

    // 每小时一个刻度
    const xTicks: string[] = [];
    for (let h = minH; h <= maxH; h++) {
      xTicks.push(`${h}:00`);
    }

    return (
      <div className="bg-white/60 rounded-2xl p-5 shadow-sm border border-white/50 h-full flex flex-col">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span>😊</span> 心情 × 工时（日视图）
        </h3>
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                ticks={xTicks}
                interval={0}
              />
              <YAxis
                yAxisId="left"
                domain={[0, 60]}
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}min`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 5]}
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: any, name: any) => {
                  if (name === '工时') return [`${value}min`, name];
                  return [String(value), name];
                }) as any}
              />
              <Bar
                yAxisId="left"
                dataKey="minutes"
                name="工时"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={getSlotColor(entry.minutes)} />
                ))}
              </Bar>
              {/* 心情水平虚线 */}
              {dayMood !== undefined && dayMood !== null && (
                <ReferenceLine
                  yAxisId="right"
                  y={dayMood}
                  stroke="#F59E0B"
                  strokeDasharray="5 3"
                  strokeWidth={2}
                  label={{
                    value: dayMoodEmoji || `${dayMood.toFixed(1)}`,
                    position: 'right',
                    fill: '#F59E0B',
                    fontSize: 16,
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // 非日视图：工时柱状图 + 心情折线图
  // 年度视图：按周聚合（365→~52个点），其他视图保持逐天
  const isYear = period === 'year';

  const chartData = (() => {
    if (!isYear) {
      // 非年度视图：逐天数据
      return data.map((d) => {
        const moodItem = moodData?.find(m => m.date === d.date);
        return {
          label: d.date.slice(5),
          hours: +(d.totalMinutes / 60).toFixed(1),
          mood: moodItem?.avgScore ?? null,
        };
      });
    }

    // 年度视图：按周聚合
    const weekMap = new Map<string, { totalMinutes: number; moodScores: number[]; count: number }>();
    for (const d of data) {
      const weekStart = startOfWeek(new Date(d.date), { weekStartsOn: 1 }); // 周一起始
      const weekKey = format(weekStart, 'MM-dd');
      const entry = weekMap.get(weekKey) || { totalMinutes: 0, moodScores: [], count: 0 };
      entry.totalMinutes += d.totalMinutes;
      entry.count++;
      const moodItem = moodData?.find(m => m.date === d.date);
      if (moodItem?.avgScore != null) entry.moodScores.push(moodItem.avgScore);
      weekMap.set(weekKey, entry);
    }

    return Array.from(weekMap.entries()).map(([label, entry]) => ({
      label,
      hours: +(entry.totalMinutes / 60).toFixed(1),
      mood: entry.moodScores.length > 0
        ? +(entry.moodScores.reduce((a, b) => a + b, 0) / entry.moodScores.length).toFixed(1)
        : null,
    }));
  })();

  return (
    <div className="bg-white/60 rounded-2xl p-5 shadow-sm border border-white/50 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <span>😊</span> 心情 × 工时
      </h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}h`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 5]}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((value: any, name: any) => {
                if (name === '工时') return [`${value}h`, name];
                const moodOpt = MOOD_OPTIONS.find((m) => m.score === (value as number));
                return [moodOpt ? `${moodOpt.emoji} ${moodOpt.label}` : String(value), name];
              }) as any}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="hours"
              name="工时"
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={getDayDualColor(entry.hours * 60)} />
              ))}
            </Bar>
            <Line
              yAxisId="right"
              dataKey="mood"
              name="心情"
              type="natural"
              stroke="#F59E0B"
              strokeWidth={2.5}
              dot={isYear ? false : { fill: '#F59E0B', r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
