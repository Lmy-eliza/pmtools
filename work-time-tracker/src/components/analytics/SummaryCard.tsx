import { formatDuration } from '../../utils/timeUtils';
import { MOOD_OPTIONS } from '../../types';

interface Props {
  totalMinutes: number;
  avgMinutesPerDay: number;
  busiestDay: { date: string; minutes: number } | null;
  quietestDay: { date: string; minutes: number } | null;
  completedTodos: number;
  totalTodos: number;
  peakHour: number | null;
  avgMood: number | null;
}

export default function SummaryCard({
  totalMinutes,
  avgMinutesPerDay,
  busiestDay,
  quietestDay,
  completedTodos,
  totalTodos,
  peakHour,
  avgMood,
}: Props) {
  const moodEmoji = avgMood !== null
    ? MOOD_OPTIONS.reduce((closest, opt) =>
        Math.abs(opt.score - avgMood!) < Math.abs(closest.score - avgMood!)
          ? opt
          : closest
      ).emoji
    : '—';

  const items = [
    { emoji: '📊', label: '总工时', value: formatDuration(totalMinutes) },
    { emoji: '📅', label: '日均', value: formatDuration(Math.round(avgMinutesPerDay)) },
    {
      emoji: '🏆',
      label: '最忙',
      value: busiestDay
        ? `${busiestDay.date.slice(5)} ${formatDuration(busiestDay.minutes)}`
        : '—',
    },
    {
      emoji: '🌴',
      label: '最闲',
      value: quietestDay
        ? `${quietestDay.date.slice(5)} ${formatDuration(quietestDay.minutes)}`
        : '—',
    },
    {
      emoji: '✨',
      label: '完成',
      value: `${completedTodos}/${totalTodos}`,
    },
    {
      emoji: '⏰',
      label: '高峰',
      value: peakHour !== null ? `${peakHour}:00-${peakHour + 1}:00` : '—',
    },
    {
      emoji: moodEmoji,
      label: '平均心情',
      value: avgMood !== null ? avgMood.toFixed(1) : '—',
    },
  ];

  return (
    <div className="bg-white/60 rounded-2xl p-5 shadow-sm border border-white/50 h-full">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <span>📈</span> 汇总
      </h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-gray-500 flex items-center gap-1.5">
              <span>{item.emoji}</span>
              {item.label}
            </span>
            <span className="font-medium text-gray-800">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
