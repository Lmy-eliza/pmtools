import { useRef, useState, useEffect } from 'react';
import type { AnalyticsPeriod, HeatMapCell, HeatMapColumn, MonthCalendarCell } from '../../types';

interface Props {
  data: HeatMapCell[];
  period: AnalyticsPeriod;
  columns: HeatMapColumn[];
  startHour?: number;
  endHour?: number;
  monthCalendarData?: MonthCalendarCell[];
}

// #9: Slot-level color (per hour, max 60min, always green)
export function getSlotColor(minutes: number): string {
  if (minutes === 0) return '#f3f4f6';
  if (minutes < 15) return '#dcfce7';
  if (minutes < 30) return '#86efac';
  if (minutes < 45) return '#4ade80';
  if (minutes < 60) return '#22c55e';
  return '#16a34a';
}

// #9: Day-level dual color (深绿→浅绿→浅红→深红)
export function getDayDualColor(totalMinutes: number): string {
  if (totalMinutes === 0) return '#f3f4f6';      // 无数据 灰
  if (totalMinutes < 120) return '#16a34a';       // <2h 深绿
  if (totalMinutes < 240) return '#22c55e';       // 2-4h 中绿
  if (totalMinutes < 360) return '#86efac';       // 4-6h 浅绿
  if (totalMinutes < 480) return '#fca5a5';       // 6-8h 浅红
  return '#dc2626';                                // ≥8h 深红
}

// Slot legend colors
const SLOT_LEGEND_COLORS = [
  { mins: 0, color: '#f3f4f6' },
  { mins: 15, color: '#dcfce7' },
  { mins: 30, color: '#86efac' },
  { mins: 45, color: '#4ade80' },
  { mins: 60, color: '#22c55e' },
  { mins: 61, color: '#16a34a' },
];

// Day legend colors（统一导出，HeatMapYear 复用）
export const DAY_LEGEND_COLORS = [
  { mins: 0,   color: '#f3f4f6' },  // 无数据
  { mins: 120, color: '#16a34a' },   // <2h 深绿
  { mins: 240, color: '#22c55e' },   // 2-4h 中绿
  { mins: 360, color: '#86efac' },   // 4-6h 浅绿
  { mins: 480, color: '#fca5a5' },   // 6-8h 浅红
  { mins: 481, color: '#dc2626' },   // ≥8h 深红
];

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// 格式化分钟为可读字符串
function formatMinutesToHM(mins: number): string {
  if (mins === 0) return '无记录';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function HeatMap({
  data,
  period,
  columns,
  startHour = 8,
  endHour = 18,
  monthCalendarData,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(24);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  // Dynamic cell size based on container width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width - 60; // subtract label column
        const hours: number[] = [];
        for (let h = startHour; h <= endHour; h++) hours.push(h);
        const colCount = period === 'month' ? 7 : hours.length;
        const size = Math.max(12, Math.min(32, Math.floor(width / (colCount + 1))));
        setCellSize(size);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [startHour, endHour, period]);

  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) {
    hours.push(h);
  }

  const grid = new Map<string, number>();
  for (const cell of data) {
    grid.set(`${cell.day}-${cell.hour}`, cell.minutes);
  }

  const fontSize = cellSize <= 14 ? '8px' : '10px';

  // Legend 组件：统一使用 DAY_LEGEND_COLORS
  const Legend = () => {
    return (
      <div className="flex items-center justify-end gap-1 mt-3 text-[10px] text-gray-400">
        <span>少</span>
        {DAY_LEGEND_COLORS.map((c, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{ backgroundColor: c.color, width: 12, height: 12 }}
          />
        ))}
        <span>多</span>
      </div>
    );
  };

  // Month view: calendar-style (rows = week numbers, cols = weekdays)
  if (period === 'month' && monthCalendarData && monthCalendarData.length > 0) {
    const calGrid = new Map<string, number>();
    for (const cell of monthCalendarData) {
      calGrid.set(`${cell.weekIndex}-${cell.weekday}`, cell.totalMinutes);
    }
    const weekCount = Math.max(...monthCalendarData.map(c => c.weekIndex)) + 1;
    const weekRows = Array.from({ length: weekCount }, (_, i) => i);

    return (
      <div className="bg-white/60 rounded-2xl p-5 shadow-sm border border-white/50">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span>🔥</span> 工作热力图
        </h3>
        <div ref={containerRef} className="overflow-x-auto">
          <table className="mx-auto" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th className="w-12" />
                {WEEKDAY_LABELS.map((label, i) => (
                  <th
                    key={i}
                    className="text-gray-400 font-normal pb-1 text-center"
                    style={{ fontSize, width: cellSize + 4 }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekRows.map((weekIdx) => (
                <tr key={weekIdx}>
                  <td className="text-[10px] text-gray-400 pr-2 text-right font-mono sticky left-0 bg-white/60">
                    W{weekIdx + 1}
                  </td>
                  {WEEKDAY_LABELS.map((_, dayIdx) => {
                    const mins = calGrid.get(`${weekIdx}-${dayIdx}`) || 0;
                    const cellData = monthCalendarData.find(
                      c => c.weekIndex === weekIdx && c.weekday === dayIdx
                    );
                    return (
                      <td key={dayIdx} className="p-0.5">
                        <div
                          className="rounded-sm transition-colors cursor-pointer"
                          style={{
                            // #9: use dual color for month calendar
                            backgroundColor: cellData ? getDayDualColor(mins) : 'transparent',
                            width: cellSize,
                            height: cellSize,
                          }}
                          onMouseEnter={(e) => {
                            if (!cellData) return;
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 8, text: `${cellData.date} ${formatMinutesToHM(mins)}` });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {/* #9: Legend */}
          <Legend />
        </div>
        {/* 自定义 tooltip 浮层 */}
        {tooltip && (
          <div
            className="fixed z-50 px-2.5 py-1.5 rounded-lg bg-gray-800 text-white text-xs shadow-lg pointer-events-none whitespace-nowrap"
            style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
          >
            {tooltip.text}
          </div>
        )}
      </div>
    );
  }

  // Transposed layout: rows = columns (day labels), cols = hours
  return (
    <div className="bg-white/60 rounded-2xl p-5 shadow-sm border border-white/50">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <span>🔥</span> 工作热力图
      </h3>
      <div ref={containerRef} className="overflow-x-auto">
        <table className="mx-auto" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th className="w-12 sticky left-0 bg-white/60 z-10" />
              {hours.map((hour) => (
                <th
                  key={hour}
                  className="text-gray-400 font-normal pb-1 text-center"
                  style={{ fontSize, width: cellSize + 4 }}
                >
                  {/* #12: format as "6:00" */}
                  {hour}:00
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {columns.map((col) => (
              <tr key={col.key}>
                <td className="text-[10px] text-gray-400 pr-2 text-right font-mono sticky left-0 bg-white/60 z-10 whitespace-nowrap">
                  {col.label}
                </td>
                {hours.map((hour) => {
                  const mins = grid.get(`${col.key}-${hour}`) || 0;
                  return (
                    <td key={hour} className="p-0.5">
                      <div
                        className="rounded-sm transition-colors cursor-pointer"
                        style={{
                          backgroundColor: getSlotColor(mins),
                          width: cellSize,
                          height: cellSize,
                        }}
                        onMouseEnter={(e) => {
                          const rect = (e.target as HTMLElement).getBoundingClientRect();
                          setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 8, text: `${col.label} ${hour}:00 ${formatMinutesToHM(mins)}` });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {/* #9: Legend */}
        <Legend />
      </div>
      {/* 自定义 tooltip 浮层 */}
      {tooltip && (
        <div
          className="fixed z-50 px-2.5 py-1.5 rounded-lg bg-gray-800 text-white text-xs shadow-lg pointer-events-none whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
