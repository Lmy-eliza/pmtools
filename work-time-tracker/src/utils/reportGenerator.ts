import type { TimeBlock, Todo, AnalyticsPeriod } from '../types';
import { formatDuration } from './timeUtils';

interface ReportData {
  blocks: TimeBlock[];
  todos: Todo[];
  period: AnalyticsPeriod;
  rangeLabel: string;
  dateStr?: string;
}

export function generateReport({ blocks, todos, period, rangeLabel, dateStr }: ReportData): string {
  const totalMinutes = blocks.reduce((sum, b) => sum + b.duration_minutes, 0);
  const completedCount = todos.filter(t => t.status === 'completed').length;
  const lines: string[] = [];

  if (period === 'day') {
    // Daily report
    lines.push(`📅 ${dateStr || rangeLabel} 工作日报`);
    lines.push(`总工时: ${formatDuration(totalMinutes)} | 完成: ${completedCount}/${todos.length}`);
    lines.push('');

    // Group blocks by tag
    const tagMap = new Map<string, { tagName: string; blocks: TimeBlock[]; totalMins: number }>();
    for (const b of blocks) {
      const key = b.tag_id || b.tag_name;
      const existing = tagMap.get(key);
      if (existing) {
        existing.blocks.push(b);
        existing.totalMins += b.duration_minutes;
      } else {
        tagMap.set(key, { tagName: b.tag_name, blocks: [b], totalMins: b.duration_minutes });
      }
    }

    // Sort by total time desc
    const sorted = Array.from(tagMap.values()).sort((a, b) => b.totalMins - a.totalMins);

    for (const group of sorted) {
      lines.push(`[${group.tagName}] (${formatDuration(group.totalMins)})`);
      // Sort blocks by start time
      const sortedBlocks = group.blocks.sort((a, b) => a.start_time.localeCompare(b.start_time));
      for (const b of sortedBlocks) {
        lines.push(`  • ${b.start_time}-${b.end_time} ${b.todo_title} (${formatDuration(b.duration_minutes)})`);
      }
      lines.push('');
    }
  } else {
    // Weekly/monthly/quarterly/yearly report
    lines.push(`📊 ${rangeLabel} 工作报告`);
    lines.push(`总工时: ${formatDuration(totalMinutes)} | 待办完成: ${completedCount}/${todos.length}`);
    lines.push('');

    // Group by date
    const dateMap = new Map<string, { blocks: TimeBlock[]; totalMins: number }>();
    for (const b of blocks) {
      const existing = dateMap.get(b.date);
      if (existing) {
        existing.blocks.push(b);
        existing.totalMins += b.duration_minutes;
      } else {
        dateMap.set(b.date, { blocks: [b], totalMins: b.duration_minutes });
      }
    }

    // Daily summary
    lines.push('📅 每日汇总:');
    const sortedDates = Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [date, data] of sortedDates) {
      lines.push(`  ${date}: ${formatDuration(data.totalMins)}`);
    }
    lines.push('');

    // Tag summary
    const tagMap = new Map<string, { tagName: string; totalMins: number }>();
    for (const b of blocks) {
      const key = b.tag_id || b.tag_name;
      const existing = tagMap.get(key);
      if (existing) {
        existing.totalMins += b.duration_minutes;
      } else {
        tagMap.set(key, { tagName: b.tag_name, totalMins: b.duration_minutes });
      }
    }

    lines.push('🏷 标签汇总:');
    const sortedTags = Array.from(tagMap.values()).sort((a, b) => b.totalMins - a.totalMins);
    for (const tag of sortedTags) {
      const pct = totalMinutes > 0 ? Math.round((tag.totalMins / totalMinutes) * 100) : 0;
      lines.push(`  [${tag.tagName}] ${formatDuration(tag.totalMins)} (${pct}%)`);
    }
  }

  return lines.join('\n');
}
