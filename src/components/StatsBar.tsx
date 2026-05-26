import React from 'react';
import { useCanvasStore } from '../stores/canvasStore';

export const StatsBar: React.FC = () => {
  const nodes = useCanvasStore((s) => s.nodes);

  let completed = 0;
  let delayed = 0;
  let onTrack = 0;

  for (const node of nodes) {
    const s = node.status ?? 'on_track';
    if (s === 'completed') completed++;
    else if (s === 'delayed') delayed++;
    else onTrack++;
  }

  const total = nodes.length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="h-7 bg-white border-b border-gray-200 flex items-center px-3 gap-4 text-xs flex-shrink-0 select-none">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-gray-500">已完成</span>
        <span className="font-semibold text-gray-800">{completed}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-blue-500" />
        <span className="text-gray-500">进行中</span>
        <span className="font-semibold text-gray-800">{onTrack}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-gray-500">延期</span>
        <span className="font-semibold text-gray-800">{delayed}</span>
      </span>
      <span className="w-px h-3.5 bg-gray-200" />
      <span className="text-gray-500">
        完成率 <span className="font-semibold text-gray-800">{rate}%</span>
      </span>
      <span className="w-px h-3.5 bg-gray-200" />
      <span className="text-gray-500">
        节点 <span className="font-semibold text-gray-800">{total}</span>
      </span>
    </div>
  );
};
