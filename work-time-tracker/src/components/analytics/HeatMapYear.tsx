import { useMemo, useState } from 'react';
import type { YearHeatMapCell } from '../../types';
import { getDayDualColor, DAY_LEGEND_COLORS } from './HeatMap';

interface Props {
  data: YearHeatMapCell[];
}

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export default function HeatMapYear({ data }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const grid = useMemo(() => {
    const map = new Map<string, YearHeatMapCell>();
    for (const cell of data) {
      map.set(`${cell.weekIndex}-${cell.weekday}`, cell);
    }
    return map;
  }, [data]);

  const maxWeekIndex = useMemo(() => {
    return data.length > 0 ? Math.max(...data.map(d => d.weekIndex)) : 52;
  }, [data]);

  // Month label positions
  const monthLabels = useMemo(() => {
    const labels: { weekIndex: number; label: string }[] = [];
    const seen = new Set<number>();
    for (const cell of data) {
      const day = parseInt(cell.date.split('-')[2]);
      if (day <= 7 && cell.weekday === 0) {
        const month = parseInt(cell.date.split('-')[1]) - 1;
        if (!seen.has(month)) {
          seen.add(month);
          labels.push({ weekIndex: cell.weekIndex, label: MONTH_NAMES[month] });
        }
      }
    }
    for (const cell of data) {
      const day = parseInt(cell.date.split('-')[2]);
      if (day === 1) {
        const month = parseInt(cell.date.split('-')[1]) - 1;
        if (!seen.has(month)) {
          seen.add(month);
          labels.push({ weekIndex: cell.weekIndex, label: MONTH_NAMES[month] });
        }
      }
    }
    return labels.sort((a, b) => a.weekIndex - b.weekIndex);
  }, [data]);

  const cellSize = 12;
  const gap = 2;
  const labelWidth = 24;
  const totalWidth = labelWidth + (maxWeekIndex + 1) * (cellSize + gap) + 20;
  const totalHeight = 7 * (cellSize + gap) + 40;

  const handleMouseEnter = (e: React.MouseEvent, cell: YearHeatMapCell | undefined) => {
    if (!cell) return;
    const h = Math.floor(cell.totalMinutes / 60);
    const m = cell.totalMinutes % 60;
    const timeStr = cell.totalMinutes === 0 ? '无记录' : h > 0 ? `${h}h ${m}m` : `${m}m`;
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      text: `${cell.date}: ${timeStr}`,
    });
  };

  return (
    <div className="bg-white/60 rounded-2xl p-5 shadow-sm border border-white/50">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <span>🔥</span> 年度工作热力图
      </h3>
      <div className="overflow-x-auto">
        <svg width={totalWidth} height={totalHeight} className="mx-auto">
          {/* Month labels at top */}
          {monthLabels.map((ml) => (
            <text
              key={ml.weekIndex}
              x={labelWidth + ml.weekIndex * (cellSize + gap)}
              y={10}
              fontSize="10"
              fill="#9ca3af"
            >
              {ml.label}
            </text>
          ))}

          {/* Weekday labels on left */}
          {WEEKDAY_LABELS.map((label, i) => (
            <text
              key={i}
              x={0}
              y={20 + i * (cellSize + gap) + cellSize / 2 + 3}
              fontSize="9"
              fill="#9ca3af"
            >
              {i % 2 === 0 ? label : ''}
            </text>
          ))}

          {/* Grid cells */}
          {Array.from({ length: maxWeekIndex + 1 }, (_, weekIdx) =>
            Array.from({ length: 7 }, (_, dayIdx) => {
              const cell = grid.get(`${weekIdx}-${dayIdx}`);
              return (
                <rect
                  key={`${weekIdx}-${dayIdx}`}
                  x={labelWidth + weekIdx * (cellSize + gap)}
                  y={18 + dayIdx * (cellSize + gap)}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  // #9: use dual color
                  fill={cell ? getDayDualColor(cell.totalMinutes) : '#f3f4f6'}
                  className="transition-colors cursor-pointer"
                  onMouseEnter={(e) => handleMouseEnter(e, cell)}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })
          )}

          {/* #9: Updated legend with dual colors */}
          <text
            x={totalWidth - 180}
            y={totalHeight - 5}
            fontSize="10"
            fill="#9ca3af"
          >
            少
          </text>
          {DAY_LEGEND_COLORS.map((item, i) => (
            <rect
              key={i}
              x={totalWidth - 150 + i * (cellSize + 2)}
              y={totalHeight - 16}
              width={cellSize}
              height={cellSize}
              rx={2}
              fill={item.color}
            />
          ))}
          <text
            x={totalWidth - 150 + DAY_LEGEND_COLORS.length * (cellSize + 2) + 2}
            y={totalHeight - 5}
            fontSize="10"
            fill="#9ca3af"
          >
            多
          </text>
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg pointer-events-none"
          style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
