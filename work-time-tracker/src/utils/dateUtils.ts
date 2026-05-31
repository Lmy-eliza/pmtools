import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, eachDayOfInterval, getDay, getHours, parseISO, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDisplayDate(date: Date): string {
  return format(date, 'yyyy-MM-dd') + ' ' + WEEKDAY_NAMES[getDay(date)];
}

export function formatMonthDay(date: Date): string {
  return format(date, 'M/d');
}

export function getWeekdayName(date: Date): string {
  return WEEKDAY_NAMES[getDay(date)];
}

export function getShortWeekday(day: number): string {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][day];
}

export function prevDay(date: Date): Date {
  return subDays(date, 1);
}

export function nextDay(date: Date): Date {
  return addDays(date, 1);
}

export function getDayRange(date: Date): { start: Date; end: Date } {
  return { start: date, end: date };
}

export function getWeekRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  };
}

export function getMonthRange(date: Date): { start: Date; end: Date } {
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

export function getQuarterRange(date: Date): { start: Date; end: Date } {
  return { start: startOfQuarter(date), end: endOfQuarter(date) };
}

export function getYearRange(date: Date): { start: Date; end: Date } {
  return { start: startOfYear(date), end: endOfYear(date) };
}

export function getDaysInRange(start: Date, end: Date): Date[] {
  return eachDayOfInterval({ start, end });
}

export function getWeekNumber(date: Date): number {
  const firstDay = startOfYear(date);
  const days = Math.floor((date.getTime() - firstDay.getTime()) / 86400000);
  return Math.ceil((days + firstDay.getDay() + 1) / 7);
}

export function parseDateStr(str: string): Date {
  return parseISO(str);
}

export function isTodayDate(date: Date): boolean {
  return isToday(date);
}

/**
 * Convert "YYYY-MM-DD" to local-midnight timestamp (ms).
 * Used for Feishu bitable numeric date fields.
 */
export function dateToTimestamp(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/**
 * 将 "YYYY-MM-DD" 转为当天 [00:00, 次日00:00) 的时间戳范围。
 * 用于飞书多维表格日期字段的范围查询，避免时区偏移导致精确匹配查不到数据。
 */
export function dateToTimestampRange(dateStr: string): { startTs: number; endTs: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const startTs = new Date(y, m - 1, d).getTime();
  const endTs = new Date(y, m - 1, d + 1).getTime();
  return { startTs, endTs };
}

/**
 * Convert a timestamp (ms) back to "YYYY-MM-DD" using local timezone.
 */
export function timestampToDateStr(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Normalize any date-like value to "YYYY-MM-DD" string.
 * Handles: number timestamps, string timestamps, ISO strings, YYYY-MM-DD strings.
 */
export function ensureDateStr(value: unknown): string {
  if (typeof value === 'number') {
    return timestampToDateStr(value);
  }
  if (typeof value === 'string') {
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    // String-encoded timestamp (e.g. "1742947200000")
    if (/^\d{13,}$/.test(value)) return timestampToDateStr(Number(value));
    // Try parsing as date
    const d = new Date(value);
    if (!isNaN(d.getTime())) return formatDate(d);
  }
  return String(value);
}

export { format, getDay, getHours, zhCN };
