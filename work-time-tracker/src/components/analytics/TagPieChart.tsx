import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TagStats } from '../../types';
import { formatDuration } from '../../utils/timeUtils';

interface Props {
  data: TagStats[];
}

/** 单列最多显示几个标签（超过则切双列） */
const SINGLE_COL_MAX = 8;

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

  const useTwoColumns = data.length > SINGLE_COL_MAX;

  // 双列时：优先填满右列，再填左列
  const legendItems = useTwoColumns
    ? (() => {
        const half = Math.ceil(data.length / 2);
        // 右列放前 half 个（靠前=占比大），左列放剩余
        const rightCol = data.slice(0, half);
        const leftCol = data.slice(half);
        return { leftCol, rightCol };
      })()
    : null;

  const LegendItem = ({ entry }: { entry: TagStats }) => (
    <div className="flex items-center gap-1.5 text-xs min-w-0">
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: entry.color }}
      />
      <span className="text-gray-600 truncate">
        {entry.emoji} {entry.tag_name}
      </span>
      <span className="ml-auto text-gray-400 text-[10px] whitespace-nowrap">
        {formatDuration(entry.totalMinutes)} ({entry.percentage.toFixed(0)}%)
      </span>
    </div>
  );

  return (
    <div className="bg-white/60 rounded-2xl p-5 shadow-sm border border-white/50 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <span>🏷️</span> 标签工时分布
      </h3>
      {/* 圆环（左） + Legend（右） 横向布局 */}
      <div className="flex-1 flex items-center gap-4 min-h-0">
        {/* 左侧：圆环图 */}
        <div className="w-[180px] h-[180px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
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
        {/* 右侧：Legend 列表 */}
        <div className="flex-1 min-w-0 max-h-[220px] overflow-y-auto pr-1">
          {useTwoColumns && legendItems ? (
            // 双列：右列优先排满，左列排剩余
            <div className="flex gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                {legendItems.leftCol.map((entry) => (
                  <LegendItem key={entry.tag_id} entry={entry} />
                ))}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                {legendItems.rightCol.map((entry) => (
                  <LegendItem key={entry.tag_id} entry={entry} />
                ))}
              </div>
            </div>
          ) : (
            // 单列：纵向排布
            <div className="space-y-1.5">
              {data.map((entry) => (
                <LegendItem key={entry.tag_id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
