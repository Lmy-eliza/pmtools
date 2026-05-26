// 节点类型枚举
export type NodeType = 'diamond' | 'triangle' | 'rectangle' | 'star' | 'circle' | 'hexagon' | 'emoji' | 'pentagon';

// 节点状态
export type NodeStatus = 'on_track' | 'completed' | 'delayed';

// 基础节点接口
export interface PlanNode {
  id: string;
  type: NodeType;
  name: string;
  color: string;
  x: number; // 画布上的x坐标
  y: number; // 画布上的y坐标
  date: Date; // 对应的日期
  swimlaneId: string; // 所属泳道ID
  width?: number; // 仅用于矩形节点
  endDate?: Date; // 仅用于矩形节点（活动结束日期）
  emoji?: string; // 仅用于 emoji 节点
  status?: NodeStatus;
}

// 连接线锚点位置类型
export type AnchorPosition = 'top' | 'bottom' | 'left' | 'right';

// 连接线路径配置
export interface ConnectionPathConfig {
  sourceAnchor: AnchorPosition;  // 源节点出发边缘
  targetAnchor: AnchorPosition;  // 目标节点进入边缘
  // 转折点使用相对坐标（0-1），便于节点移动时自动调整
  bendPoints?: Array<{ rx: number; ry: number }>;
}

// 连接线接口
export interface Connection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  style: 'solid' | 'dashed' | 'dotted'; // 实线、虚线（条状）或虚线（点状）
  color?: string; // 线条颜色
  isCriticalPath?: boolean; // 是否为关键路径
  pathConfig?: ConnectionPathConfig;  // 路径配置
  labelOffset?: { x: number; y: number };  // 标签相对于默认位置的偏移
}

// 时间约束接口
export interface TimeConstraint {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  offsetMonths: number; // 间隔月数（可为负）
  isLocked: boolean; // 是否锁定约束
  style?: 'solid' | 'dashed' | 'dotted'; // 线条样式
  color?: string; // 线条颜色
  labelOffset?: { x: number; y: number };  // 标签相对于默认位置的偏移
}

// 泳道接口
export interface Swimlane {
  id: string;
  name: string;
  order: number; // 排序顺序
  isCollapsed: boolean; // 是否折叠
}

// 项目数据接口
export interface ProjectData {
  id: string;
  name: string;
  schemaVersion?: string;
  startDate: Date;
  endDate: Date;
  swimlanes: Swimlane[];
  nodes: PlanNode[];
  connections: Connection[];
  constraints: TimeConstraint[];
  createdAt: Date;
  updatedAt: Date;
}

// 时间轴视图类型
export type TimelineView = 'day' | 'week' | 'month' | 'quarter';

// 画布设置
export interface CanvasSettings {
  zoom: number;
  panX: number;
  panY: number;
  monthWidth: number; // 每月的像素宽度
  swimlaneHeight: number; // 泳道高度
  showConstraints: boolean; // 显示约束线
  showIntervals: boolean; // 显示间隔周期
  intervalUnit: 'day' | 'week' | 'month'; // 间隔显示单位
  intervalDecimals: 0 | 1 | 2; // 小数位数
  timelineView: TimelineView; // 时间轴视图（需求18）
  autoLinkUnit: boolean; // 自动联动单位（需求19）
}

// 工具类型
export type ToolType = 'select' | 'diamond' | 'triangle' | 'rectangle' | 'star' | 'circle' | 'hexagon' | 'emoji' | 'pentagon' | 'connection';

// 版本数据结构
export interface ProjectVersion {
  id: string;
  projectId: string;
  name: string; // 版本名称，如 "v1" 或 "2024-03-09 14:30"
  description?: string; // 版本说明（可选）
  data: ProjectData; // 完整的项目数据快照
  createdAt: Date;
}

// 预设节点模板
export interface NodePreset {
  name: string;
  type: NodeType;
  color: string;
  category: string;
}
