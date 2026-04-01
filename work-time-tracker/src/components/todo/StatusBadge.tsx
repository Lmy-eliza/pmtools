import type { TodoStatus } from '../../types';
import { STATUS_CONFIG } from '../../types';

interface Props {
  status: TodoStatus;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, onClick, size = 'md' }: Props) {
  const config = STATUS_CONFIG[status];

  const sizeClasses =
    size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-sm px-3 py-1 gap-1.5';

  const interactive = !!onClick;

  return (
    <span
      onClick={onClick}
      onPointerDown={interactive ? (e) => e.stopPropagation() : undefined}
      className={`inline-flex items-center rounded-full bg-gradient-to-r ${config.gradient} text-white font-medium transition-all ${sizeClasses} ${status === 'in_progress' ? 'status-pulse' : ''} ${interactive ? 'cursor-pointer hover:scale-105 hover:ring-2 hover:ring-white/50 hover:shadow-sm active:scale-95' : ''}`}
      title={interactive ? `点击切换状态: ${config.label}` : config.label}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  );
}
