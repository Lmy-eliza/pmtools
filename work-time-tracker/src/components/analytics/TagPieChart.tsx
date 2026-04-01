import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { TagStats } from '../../types';
import { formatDuration } from '../../utils/timeUtils';

interface Props {
  data: TagStats[];
}

export default function TagPieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-white/60 rounded-2xl p-5 shadow-sm border border-white/50 h-full flex flex-col">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span>🏷️</span> 标签工时分布
        </h3>
        <div className="text-center py-8 text-gray-400 text-sm flex-1 flex items-center justify-center">暂无数据</div>
      </div>
    );
  }

  return (
    <div className="bg-white/60 rounded-2xl p-5 shadow-sm border border-white/50 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <span>🏷️</span> 标签工时分布
      </h3>
      <div className="flex-1 min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="totalMinutes"
            nameKey="tag_name"
          >
            {data.map((entry) => (
              <Cell key={entry.tag_id} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: any) => [formatDuration(value as number), '工时']) as any}
          />
        </PieChart>
      </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="space-y-1.5 mt-2">
        {data.map((entry) => (
          <div key={entry.tag_id} className="flex items-center gap-2 text-sm">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">
              {entry.emoji} {entry.tag_name}
            </span>
            <span className="ml-auto text-gray-400 text-xs">
              {formatDuration(entry.totalMinutes)} ({entry.percentage.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
