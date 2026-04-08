import type { NodePreset } from '../types';

// 汽车行业预设节点模板
export const nodePresets: NodePreset[] = [
  // 阶段门 (Toll Gates)
  { name: 'TG0', type: 'diamond', color: '#007AFF', category: '阶段门' },
  { name: 'TG1', type: 'diamond', color: '#007AFF', category: '阶段门' },
  { name: 'TG2', type: 'diamond', color: '#007AFF', category: '阶段门' },
  { name: 'TG3', type: 'diamond', color: '#007AFF', category: '阶段门' },

  // 工程样件 (Engineering Prototypes)
  { name: 'EP1', type: 'diamond', color: '#34C759', category: '工程样件' },
  { name: 'EP2', type: 'diamond', color: '#34C759', category: '工程样件' },
  { name: 'EP3', type: 'diamond', color: '#34C759', category: '工程样件' },

  // 验证阶段
  { name: 'DV', type: 'diamond', color: '#FF9500', category: '验证' },
  { name: 'PV', type: 'diamond', color: '#FF9500', category: '验证' },

  // 生产阶段
  { name: 'SOP', type: 'diamond', color: '#FF3B30', category: '生产' },
  { name: 'EOP', type: 'diamond', color: '#8E8E93', category: '生产' },

  // 决策点
  { name: '决策点', type: 'triangle', color: '#AF52DE', category: '决策' },
  { name: '里程碑', type: 'diamond', color: '#5856D6', category: '通用' },

  // 活动
  { name: '开发活动', type: 'rectangle', color: '#32ADE6', category: '活动' },
  { name: '测试活动', type: 'rectangle', color: '#FF9F0A', category: '活动' },
  { name: '验证活动', type: 'rectangle', color: '#64D2FF', category: '活动' },
];

// 默认节点颜色
export const defaultColors: Record<string, string> = {
  diamond: '#007AFF',
  triangle: '#AF52DE',
  rectangle: '#32ADE6',
  star: '#FFD700',
  circle: '#34C759',
  hexagon: '#5856D6',
  emoji: '#FF9500',
};

// 颜色预设
export const colorPresets = [
  '#007AFF', // Blue
  '#34C759', // Green
  '#FF9500', // Orange
  '#FF3B30', // Red
  '#AF52DE', // Purple
  '#5856D6', // Indigo
  '#32ADE6', // Cyan
  '#FF9F0A', // Yellow
  '#8E8E93', // Gray
  '#000000', // Black
];
