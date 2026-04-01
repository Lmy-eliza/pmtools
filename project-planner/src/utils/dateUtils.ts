import { addMonths, differenceInMonths, differenceInDays, differenceInWeeks, format, startOfMonth, getWeek, getQuarter, eachDayOfInterval, eachWeekOfInterval, startOfQuarter, addQuarters, addDays, addWeeks, startOfWeek, getDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 根据时间轴视图类型获取单位宽度
 * 问题5修复：天~25px，周~50px，月~100px，季~250px
 */
export function getUnitWidth(view: 'day' | 'week' | 'month' | 'quarter'): number {
  switch (view) {
    case 'day':
      return 25;
    case 'week':
      return 50;
    case 'month':
      return 100;
    case 'quarter':
      return 250;
    default:
      return 100;
  }
}

/**
 * 确保日期顺序正确（小日期在前，大日期在后）
 */
export function ensureDateOrder(start: Date, end: Date): [Date, Date] {
  if (start > end) {
    return [end, start];
  }
  return [start, end];
}

/**
 * 根据x坐标计算对应的日期
 * 问题6修复：支持多视图模式
 */
export function xToDate(
  x: number,
  startDate: Date,
  unitWidth: number,
  leftOffset: number = 120,
  view: 'day' | 'week' | 'month' | 'quarter' = 'month'
): Date {
  const adjustedX = x - leftOffset;

  switch (view) {
    case 'day': {
      // 按天数计算
      const days = Math.floor(adjustedX / unitWidth);
      return addDays(startDate, days);
    }
    case 'week': {
      // 按周数计算
      const weeks = Math.floor(adjustedX / unitWidth);
      const dayInWeek = ((adjustedX % unitWidth) / unitWidth) * 7;
      const baseDate = startOfWeek(addWeeks(startDate, weeks), { locale: zhCN });
      return addDays(baseDate, Math.round(dayInWeek));
    }
    case 'month': {
      // 按月计算（原有逻辑）
      const months = Math.floor(adjustedX / unitWidth);
      const dayInMonth = ((adjustedX % unitWidth) / unitWidth) * 30;
      const date = addMonths(startDate, months);
      date.setDate(Math.max(1, Math.min(28, Math.round(dayInMonth) + 1)));
      return date;
    }
    case 'quarter': {
      // 按季度计算
      const quarters = Math.floor(adjustedX / unitWidth);
      const monthInQuarter = ((adjustedX % unitWidth) / unitWidth) * 3;
      const baseDate = addQuarters(startOfQuarter(startDate), quarters);
      return addMonths(baseDate, Math.floor(monthInQuarter));
    }
    default:
      return startDate;
  }
}

/**
 * 根据日期计算对应的x坐标
 * 问题6修复：支持多视图模式
 */
export function dateToX(
  date: Date,
  startDate: Date,
  unitWidth: number,
  leftOffset: number = 120,
  view: 'day' | 'week' | 'month' | 'quarter' = 'month'
): number {
  switch (view) {
    case 'day': {
      // 按天数差计算
      const daysDiff = differenceInDays(date, startDate);
      return leftOffset + daysDiff * unitWidth;
    }
    case 'week': {
      // 按周数差计算
      const weeksDiff = differenceInWeeks(date, startOfWeek(startDate, { locale: zhCN }));
      const dayInWeek = getDay(date) / 7;
      return leftOffset + weeksDiff * unitWidth + dayInWeek * unitWidth;
    }
    case 'month': {
      // 原有逻辑
      const monthsDiff = differenceInMonths(startOfMonth(date), startOfMonth(startDate));
      const dayRatio = (date.getDate() - 1) / 30;
      return leftOffset + monthsDiff * unitWidth + dayRatio * unitWidth;
    }
    case 'quarter': {
      // 按季度计算
      const startQuarter = getQuarter(startDate);
      const startYear = startDate.getFullYear();
      const dateQuarter = getQuarter(date);
      const dateYear = date.getFullYear();
      const quartersDiff = (dateYear - startYear) * 4 + (dateQuarter - startQuarter);
      const monthInQuarter = (date.getMonth() % 3) / 3;
      return leftOffset + quartersDiff * unitWidth + monthInQuarter * unitWidth;
    }
    default:
      return leftOffset;
  }
}

/**
 * 格式化日期显示
 */
export function formatDate(date: Date, formatStr: string = 'yyyy-MM-dd'): string {
  return format(date, formatStr, { locale: zhCN });
}

/**
 * 格式化短日期显示（月/日）
 */
export function formatShortDate(date: Date): string {
  return format(date, 'MM/dd', { locale: zhCN });
}

/**
 * 格式化月份显示
 */
export function formatMonth(date: Date): string {
  return format(date, 'MM', { locale: zhCN });
}

/**
 * 格式化年份显示
 */
export function formatYear(date: Date): string {
  return format(date, 'yyyy', { locale: zhCN });
}

/**
 * 计算两个日期之间的月数差
 */
export function monthsBetween(date1: Date, date2: Date): number {
  return differenceInMonths(date2, date1);
}

/**
 * 生成时间轴月份数组
 */
export function generateTimelineMonths(startDate: Date, endDate: Date): Date[] {
  const months: Date[] = [];
  let current = startOfMonth(startDate);
  const end = startOfMonth(endDate);

  while (current <= end) {
    months.push(new Date(current));
    current = addMonths(current, 1);
  }

  return months;
}

/**
 * 根据时间轴视图类型生成时间单元数组
 */
export function generateTimelineUnits(
  startDate: Date,
  endDate: Date,
  view: 'day' | 'week' | 'month' | 'quarter'
): Date[] {
  const units: Date[] = [];

  switch (view) {
    case 'day':
      // 生成每一天
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      return days;

    case 'week':
      // 生成每周的开始日期
      const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { locale: zhCN });
      return weeks;

    case 'month':
      // 生成每月
      return generateTimelineMonths(startDate, endDate);

    case 'quarter':
      // 生成每季度
      let currentQuarter = startOfQuarter(startDate);
      const endQuarter = startOfQuarter(endDate);
      while (currentQuarter <= endQuarter) {
        units.push(new Date(currentQuarter));
        currentQuarter = addQuarters(currentQuarter, 1);
      }
      return units;

    default:
      return generateTimelineMonths(startDate, endDate);
  }
}

/**
 * 根据时间轴视图格式化时间单元显示
 * 表头格式修复：天显示日期，周显示周数，月显示月份，季显示Q1-Q4
 */
export function formatTimelineUnit(date: Date, view: 'day' | 'week' | 'month' | 'quarter'): string {
  switch (view) {
    case 'day':
      return format(date, 'd', { locale: zhCN });
    case 'week':
      return `W${getWeek(date, { locale: zhCN })}`;
    case 'month':
      return format(date, 'M月', { locale: zhCN });
    case 'quarter':
      return `Q${getQuarter(date)}`;
    default:
      return format(date, 'M月', { locale: zhCN });
  }
}

/**
 * 根据时间轴视图格式化年份表头分组
 * 天/周视图：显示年月，月/季视图：显示年份
 */
export function formatYearHeader(date: Date, view: 'day' | 'week' | 'month' | 'quarter'): string {
  switch (view) {
    case 'day':
    case 'week':
      return format(date, 'yyyy年M月', { locale: zhCN });
    case 'month':
    case 'quarter':
      return format(date, 'yyyy年', { locale: zhCN });
    default:
      return format(date, 'yyyy年', { locale: zhCN });
  }
}

/**
 * 获取时间单元的年份显示格式（用于年份表头分组）
 */
export function getYearGroupKey(date: Date, view: 'day' | 'week' | 'month' | 'quarter'): string {
  if (view === 'quarter') {
    return format(date, 'yyyy', { locale: zhCN });
  }
  return format(date, 'yyyy', { locale: zhCN });
}

/**
 * 按年份分组月份
 */
export function groupMonthsByYear(months: Date[]): Map<number, Date[]> {
  const groups = new Map<number, Date[]>();

  for (const month of months) {
    const year = month.getFullYear();
    if (!groups.has(year)) {
      groups.set(year, []);
    }
    groups.get(year)!.push(month);
  }

  return groups;
}

/**
 * 吸附到最近的月份中心
 */
export function snapToMonthCenter(
  x: number,
  startDate: Date,
  monthWidth: number,
  leftOffset: number = 120
): { x: number; date: Date } {
  const adjustedX = x - leftOffset;
  const monthIndex = Math.round(adjustedX / monthWidth);
  const snappedX = leftOffset + monthIndex * monthWidth + monthWidth / 2;
  const date = addMonths(startDate, monthIndex);
  date.setDate(15); // 设置为月中
  return { x: snappedX, date };
}
