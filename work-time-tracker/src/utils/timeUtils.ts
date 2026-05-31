/**
 * Parse "HH:mm" to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Minutes since midnight to "HH:mm"
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Calculate duration between two "HH:mm" strings
 */
export function calcDuration(start: string, end: string): number {
  return timeToMinutes(end) - timeToMinutes(start);
}

/**
 * Format minutes as "Xh Ym"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Format seconds as "HH:MM:SS"
 */
export function formatTimerDisplay(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format seconds as "MM:SS" for pomodoro
 */
export function formatPomodoroDisplay(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Get current time as "HH:mm"
 */
export function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Round minutes to nearest 15
 */
export function roundToQuarter(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

/**
 * Snap time to 15-min grid
 */
export function snapToGrid(time: string): string {
  const mins = timeToMinutes(time);
  return minutesToTime(roundToQuarter(mins));
}

/**
 * 将 "HH:mm" 转为在 [startHour, endHour] 区间内的百分比位置。
 * 用于日程栏中时间块的定位计算。
 */
export function timeToPercent(time: string, startHour: number, endHour: number): number {
  const [h, m] = time.split(':').map(Number);
  const mins = h * 60 + m;
  const totalMins = (endHour - startHour) * 60;
  const startMins = startHour * 60;
  return ((mins - startMins) / totalMins) * 100;
}
