/**
 * Lighten a hex color by mixing with white
 */
export function lightenColor(hex: string, amount: number = 0.85): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const nr = Math.round(r + (255 - r) * amount);
  const ng = Math.round(g + (255 - g) * amount);
  const nb = Math.round(b + (255 - b) * amount);

  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

/**
 * Create a soft gradient background style from a color
 */
export function colorToGradient(color: string): string {
  const light = lightenColor(color, 0.88);
  const lighter = lightenColor(color, 0.94);
  return `linear-gradient(135deg, ${lighter}, ${light})`;
}

/**
 * Create a vibrant gradient for time block cards
 */
export function colorToBlockGradient(color: string): string {
  const light = lightenColor(color, 0.82);
  const lighter = lightenColor(color, 0.9);
  return `linear-gradient(135deg, ${lighter}, ${light})`;
}

/**
 * Add alpha to a hex color
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Get contrasting text color (black or white) for a given background
 */
export function getContrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}
