import type { NodeStatus } from '../types';

const STATUS_COLORS: Record<string, string> = {
  completed: '#34C759',
  delayed: '#FF3B30',
};

export function getStatusColor(originalColor: string, status?: NodeStatus): string {
  if (!status || status === 'on_track') return originalColor;
  return STATUS_COLORS[status] ?? originalColor;
}
