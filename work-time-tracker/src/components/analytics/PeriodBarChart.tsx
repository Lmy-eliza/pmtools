import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { PeriodBarData } from '../../types';
import { getDayDualColor } from './HeatMap';

interface Props {
  data: PeriodBarData[];
  title: string;
}

export default function PeriodBarChart({ data, title }: Props) {
  return (
    <div className="bg-white/60 rounded-2xl p-5 shadow-sm border border-white/50 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <span>📊</span> {title}
      </h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}h`}
              domain={[0, (dataMax: number) => Math.max(6, Math.ceil(dataMax))]}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((value: any) => [`${value}h`, '工时']) as any}
            />
            <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
              {data.map((entry, idx) => (
                <Cell key={idx} fill={getDayDualColor(entry.hours * 60)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
