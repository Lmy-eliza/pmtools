// ===== Tag =====
export interface Tag {
  id: string;
  name: string;
  emoji: string;
  color: string;
  is_preset: boolean;
  created_at: string;
}

// ===== Todo =====
export type TodoStatus = 'not_started' | 'in_progress' | 'paused' | 'completed';

export interface Todo {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  tag_id: string;
  tag_name: string;
  color: string;
  date: string; // YYYY-MM-DD
  created_at: string;
}

export const STATUS_CONFIG: Record<
  TodoStatus,
  { emoji: string; label: string; gradient: string }
> = {
  not_started: {
    emoji: '📋',
    label: '未开始',
    gradient: 'from-gray-200 to-gray-300',
  },
  in_progress: {
    emoji: '⚡',
    label: '进行中',
    gradient: 'from-blue-400 to-purple-500',
  },
  paused: {
    emoji: '☕',
    label: '暂停',
    gradient: 'from-orange-300 to-amber-400',
  },
  completed: {
    emoji: '✨',
    label: '已完成',
    gradient: 'from-green-400 to-emerald-500',
  },
};

export const STATUS_ORDER: TodoStatus[] = [
  'not_started',
  'in_progress',
  'paused',
  'completed',
];

// ===== Time Block =====
export type TimeBlockSource = 'manual' | 'timer' | 'pomodoro';

export interface TimeBlock {
  id: string;
  todo_id: string;
  todo_title: string;
  tag_id: string;
  tag_name: string;
  color: string;
  date: string; // YYYY-MM-DD
  start_time: string; // "HH:mm"
  end_time: string; // "HH:mm"
  duration_minutes: number;
  source: TimeBlockSource;
}

// ===== Daily Note =====
export interface DailyNote {
  id: string;
  date: string; // YYYY-MM-DD
  content: string;
  created_at: string;
}

// #13: emoji adjustment: 🦥 → 😴, label: 犯困低能 → 犯困疲惫
export const MOOD_OPTIONS: { emoji: string; label: string; score: number }[] = [
  { emoji: '🔥', label: '斗志满满', score: 5 },
  { emoji: '😎', label: '状态很好', score: 4 },
  { emoji: '🧘', label: '平静专注', score: 3 },
  { emoji: '🤔', label: '纠结思考', score: 2 },
  { emoji: '😵‍💫', label: '头大焦虑', score: 1 },
  { emoji: '😴', label: '犯困疲惫', score: 0 },
];

// #14: Mood Log interface
export interface MoodLog {
  id: string;
  date: string;        // "YYYY-MM-DD"
  emoji: string;       // mood emoji
  score: number;       // 0-5
  time: string;        // "HH:MM" record time
  created_at: string;
}

// ===== Preset Tags =====
export const PRESET_TAGS: Omit<Tag, 'id' | 'created_at'>[] = [
  { emoji: '📝', name: '文档写作', color: '#4F46E5', is_preset: true },
  { emoji: '🤖', name: 'AI 探索', color: '#8B5CF6', is_preset: true },
  { emoji: '🚀', name: '项目交付', color: '#EC4899', is_preset: true },
  { emoji: '💬', name: '会议沟通', color: '#F59E0B', is_preset: true },
  { emoji: '💻', name: '编码开发', color: '#10B981', is_preset: true },
  { emoji: '📚', name: '学习成长', color: '#06B6D4', is_preset: true },
  { emoji: '☕', name: '行政杂务', color: '#6B7280', is_preset: true },
];

// ===== 马卡龙色板（新建标签自动分配） =====
export const MACARON_PALETTE = [
  '#FF6B6B', '#FFA94D', '#FFD43B', '#69DB7C',
  '#38D9A9', '#4DABF7', '#748FFC', '#9775FA',
  '#DA77F2', '#F783AC', '#A9E34B', '#63E6BE',
  '#74C0FC', '#E599F7', '#FFC078', '#99E9F2',
];

export function getNextMacaronColor(usedColors: string[]): string {
  const usedSet = new Set(usedColors.map(c => c.toLowerCase()));
  return MACARON_PALETTE.find(c => !usedSet.has(c.toLowerCase()))
    || MACARON_PALETTE[usedColors.length % MACARON_PALETTE.length];
}

// ===== Settings =====
export interface FeishuConfig {
  appId: string;
  appSecret: string;
  appToken: string;
  todoTableId: string;
  timeBlockTableId: string;
  noteTableId: string;
  tagTableId: string;
  moodLogTableId: string; // #14: optional mood log table
}

export interface PomodoroSettings {
  defaultMinutes: number;
  breakMinutes: number;
}

// ===== Analytics =====
export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface PeriodBarData {
  label: string;
  hours: number;
}

export interface DailyStats {
  date: string;
  totalMinutes: number;
  completedTodos: number;
  totalTodos: number;
}

export interface TagStats {
  tag_id: string;
  tag_name: string;
  emoji: string;
  color: string;
  totalMinutes: number;
  percentage: number;
}

export interface HeatMapCell {
  day: number;
  hour: number;
  minutes: number;
}

export interface HeatMapColumn {
  key: number;
  label: string;
}

export interface YearHeatMapCell {
  date: string;        // "YYYY-MM-DD"
  weekday: number;     // 0=Mon...6=Sun
  weekIndex: number;   // 0-52
  totalMinutes: number;
}

export interface MonthCalendarCell {
  date: string;        // "YYYY-MM-DD"
  weekIndex: number;   // 0-4 (week row within month)
  weekday: number;     // 0=Mon...6=Sun
  totalMinutes: number;
}
