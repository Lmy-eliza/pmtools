/**
 * 生成比赛演示用的高质量 demo 数据
 *
 * 项目：P7+ 中期改款（18个月周期）
 * 场景：当前进度在 G6（条件通过）和 G4 之间，部分活动延期
 * 设计目标：6 泳道 × ~45 节点，填满一页，视觉丰富不卡顿
 *
 * 运行：node scripts/generate-demo.mjs
 * 输出：tmp/demo-showcase.json
 */

import { randomUUID } from 'crypto';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// ─── 常量 ───────────────────────────────────────────────────────

const MONTH_WIDTH = 200;      // 每月像素宽度
const SWIMLANE_HEIGHT = 120;  // 泳道高度
const HEADER_HEIGHT = 60;     // 头部高度
const NODE_Y_OFFSET = 30;     // 泳道内节点 y 偏移

const SOP_DATE = new Date('2027-03-01T00:00:00.000Z');
const PROJECT_START = new Date('2025-09-01T00:00:00.000Z');
const PROJECT_END = new Date('2027-06-01T00:00:00.000Z');

// ─── 工具函数 ───────────────────────────────────────────────────

function daysBetween(d1, d2) {
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

function dateToX(date) {
  const days = daysBetween(PROJECT_START, new Date(date));
  return Math.round(days * MONTH_WIDTH / 30);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function gateDate(monthsFromSOP) {
  const days = monthsFromSOP * 30;
  const d = new Date(SOP_DATE);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function swimlaneY(order, subOffset = 0) {
  return HEADER_HEIGHT + order * SWIMLANE_HEIGHT + NODE_Y_OFFSET + subOffset;
}

function iso(date) {
  return new Date(date).toISOString();
}

// ─── 泳道定义 ───────────────────────────────────────────────────

const swimlanes = [
  { id: randomUUID(), name: '项目管理',     order: 0, isCollapsed: false },
  { id: randomUUID(), name: '产品',         order: 1, isCollapsed: false },
  { id: randomUUID(), name: '造型与设计',   order: 2, isCollapsed: false },
  { id: randomUUID(), name: '零部件与材料', order: 3, isCollapsed: false },
  { id: randomUUID(), name: '测试与验证',   order: 4, isCollapsed: false },
  { id: randomUUID(), name: '质量与供应链', order: 5, isCollapsed: false },
];

const sw = Object.fromEntries(swimlanes.map(s => [s.name, s.id]));

// ─── 阀点节点（中改时序） ────────────────────────────────────────

const gatesDef = [
  { name: 'G10', months: -18, status: 'completed' },
  { name: 'G9',  months: -15, status: 'completed' },
  { name: 'G8',  months: -14, status: 'completed' },
  { name: 'G7',  months: -12, status: 'completed' },
  { name: 'G6',  months: -10, status: 'conditional' }, // 条件通过→黄色
  { name: 'G4',  months: -8,  status: 'pending' },
  { name: 'G3',  months: -6,  status: 'pending' },
  { name: 'G2',  months: -4,  status: 'pending' },
  { name: 'G1',  months: -2,  status: 'pending' },
  { name: 'G0',  months: 0,   status: 'pending' },     // SOP
  { name: 'GTC', months: +2,  status: 'pending' },
];

function gateColor(status) {
  switch (status) {
    case 'completed':   return '#64D2FF';   // 阀点标准色，status 覆盖为绿
    case 'conditional': return '#FFCC00';   // 黄色，保持原色
    case 'pending':     return '#C7C7CC';   // 灰色
    default:            return '#64D2FF';
  }
}

function gateNodeStatus(status) {
  if (status === 'completed') return 'completed';
  return undefined; // conditional 和 pending 不设 status，靠 color 控制
}

const gateNodes = gatesDef.map(g => {
  const date = gateDate(g.months);
  return {
    id: randomUUID(),
    type: 'pentagon',
    name: g.name,
    color: gateColor(g.status),
    x: dateToX(date),
    y: swimlaneY(0),
    date,
    swimlaneId: sw['项目管理'],
    ...(gateNodeStatus(g.status) ? { status: gateNodeStatus(g.status) } : {}),
  };
});

const gateById = Object.fromEntries(gateNodes.map(g => [g.name, g]));

// ─── 活动节点 ────────────────────────────────────────────────────

function makeActivity({ name, swimlane, startDate, durationDays, status, color, subOffset = 0 }) {
  const start = iso(startDate);
  const end = addDays(startDate, durationDays);
  const swimlaneOrder = swimlanes.find(s => s.name === swimlane).order;
  const baseColor = color || {
    '项目管理': '#007AFF',
    '产品': '#007AFF',
    '造型与设计': '#AF52DE',
    '零部件与材料': '#FF9500',
    '测试与验证': '#34C759',
    '质量与供应链': '#FF3B30',
  }[swimlane];

  const nodeColor = status === 'pending' ? '#D1D1D6' : baseColor;
  const nodeStatus = status === 'completed' ? 'completed'
    : status === 'delayed' ? 'delayed'
    : undefined;

  return {
    id: randomUUID(),
    type: 'rectangle',
    name,
    color: nodeColor,
    x: dateToX(startDate),
    y: swimlaneY(swimlaneOrder, subOffset),
    date: start,
    endDate: end,
    width: Math.max(60, Math.round(durationDays * MONTH_WIDTH / 30)),
    swimlaneId: sw[swimlane],
    ...(nodeStatus ? { status: nodeStatus } : {}),
  };
}

const activities = [
  // ─── 项目管理 ───
  makeActivity({ name: '项目启动与团队组建',     swimlane: '项目管理', startDate: '2025-09-05', durationDays: 28,  status: 'completed' }),
  makeActivity({ name: '项目计划基线发布',       swimlane: '项目管理', startDate: '2025-10-15', durationDays: 21,  status: 'completed', subOffset: 30 }),
  makeActivity({ name: '阶段总结与风险更新',     swimlane: '项目管理', startDate: '2026-05-15', durationDays: 35,  status: 'on_track' }),

  // ─── 产品 ───
  makeActivity({ name: '产品定义书发布',         swimlane: '产品', startDate: '2025-09-10', durationDays: 56,  status: 'completed' }),
  makeActivity({ name: '配置清单冻结',           swimlane: '产品', startDate: '2026-01-10', durationDays: 35,  status: 'completed' }),
  makeActivity({ name: '产品手册V2.0',           swimlane: '产品', startDate: '2026-03-10', durationDays: 42,  status: 'completed' }),
  makeActivity({ name: '产品手册V3.0锁定',       swimlane: '产品', startDate: '2026-05-15', durationDays: 49,  status: 'on_track' }),
  makeActivity({ name: 'SOP版产品手册',           swimlane: '产品', startDate: '2026-10-01', durationDays: 84,  status: 'pending', subOffset: 0 }),

  // ─── 造型与设计 ───
  makeActivity({ name: '外造型方案评审',         swimlane: '造型与设计', startDate: '2025-09-15', durationDays: 63,  status: 'completed' }),
  makeActivity({ name: '内造型方案冻结',         swimlane: '造型与设计', startDate: '2025-12-10', durationDays: 28,  status: 'completed', subOffset: 0 }),
  makeActivity({ name: '造型数据发布',           swimlane: '造型与设计', startDate: '2026-03-05', durationDays: 49,  status: 'delayed' }),  // 🔴 延期！导致G6条件通过
  makeActivity({ name: 'A面数据冻结',             swimlane: '造型与设计', startDate: '2026-05-20', durationDays: 35,  status: 'on_track' }),

  // ─── 零部件与材料 ───
  makeActivity({ name: '材料清单A版发布',         swimlane: '零部件与材料', startDate: '2025-12-01', durationDays: 21,  status: 'completed' }),
  makeActivity({ name: '零部件定点完成',         swimlane: '零部件与材料', startDate: '2026-01-05', durationDays: 56,  status: 'completed' }),
  makeActivity({ name: '模具开发与验证',         swimlane: '零部件与材料', startDate: '2026-03-01', durationDays: 63,  status: 'completed' }),
  makeActivity({ name: 'B版材料清单',             swimlane: '零部件与材料', startDate: '2026-05-10', durationDays: 42,  status: 'on_track' }),
  makeActivity({ name: '集采材料认可',           swimlane: '零部件与材料', startDate: '2026-07-15', durationDays: 56,  status: 'pending' }),
  makeActivity({ name: 'PPAP认可',               swimlane: '零部件与材料', startDate: '2026-09-20', durationDays: 49,  status: 'pending', subOffset: 0 }),

  // ─── 测试与验证 ───
  makeActivity({ name: '仿真验证完成',           swimlane: '测试与验证', startDate: '2026-01-15', durationDays: 42,  status: 'completed' }),
  makeActivity({ name: 'VR1.0软件发布',           swimlane: '测试与验证', startDate: '2026-03-10', durationDays: 56,  status: 'delayed' }),  // 🔴 延期
  makeActivity({ name: 'SR1.0软件发布',           swimlane: '测试与验证', startDate: '2026-05-25', durationDays: 49,  status: 'on_track' }),
  makeActivity({ name: '整车路试验证',           swimlane: '测试与验证', startDate: '2026-08-01', durationDays: 91,  status: 'pending' }),  // 长活动
  makeActivity({ name: '量产合规认证',           swimlane: '测试与验证', startDate: '2026-12-01', durationDays: 56,  status: 'pending', subOffset: 0 }),

  // ─── 质量与供应链 ───
  makeActivity({ name: 'APQP-1质量策划',         swimlane: '质量与供应链', startDate: '2025-12-05', durationDays: 28,  status: 'completed' }),
  makeActivity({ name: 'CUBING定点完成',         swimlane: '质量与供应链', startDate: '2026-03-15', durationDays: 42,  status: 'completed' }),
  makeActivity({ name: 'APQP-2过程验证',         swimlane: '质量与供应链', startDate: '2026-05-15', durationDays: 49,  status: 'on_track' }),
  makeActivity({ name: 'CUBING回厂',             swimlane: '质量与供应链', startDate: '2026-07-10', durationDays: 28,  status: 'pending' }),
  makeActivity({ name: '量产审核',               swimlane: '质量与供应链', startDate: '2026-11-15', durationDays: 63,  status: 'pending' }),
];

// ─── 评审/决策节点（菱形） ───────────────────────────────────────

function makeDiamond({ name, swimlane, date, status, color, subOffset = 0 }) {
  const swimlaneOrder = swimlanes.find(s => s.name === swimlane).order;
  const baseColor = color || '#007AFF';
  const nodeColor = status === 'pending' ? '#C7C7CC' : baseColor;
  const nodeStatus = status === 'completed' ? 'completed'
    : status === 'delayed' ? 'delayed'
    : undefined;

  return {
    id: randomUUID(),
    type: 'diamond',
    name,
    color: nodeColor,
    x: dateToX(date),
    y: swimlaneY(swimlaneOrder, subOffset),
    date: iso(date),
    swimlaneId: sw[swimlane],
    ...(nodeStatus ? { status: nodeStatus } : {}),
  };
}

const diamonds = [
  makeDiamond({ name: '概念评审',       swimlane: '项目管理', date: '2025-11-20', status: 'completed', subOffset: 30 }),
  makeDiamond({ name: '方案确认评审',   swimlane: '产品',     date: '2026-02-20', status: 'completed', subOffset: 30 }),
  makeDiamond({ name: '造型冻结评审',   swimlane: '造型与设计', date: '2026-04-25', status: 'delayed', subOffset: 30 }),  // 造型延期影响
  makeDiamond({ name: '工程验证评审',   swimlane: '测试与验证', date: '2026-06-20', status: 'on_track', subOffset: 30 }),
  makeDiamond({ name: '量产就绪评审',   swimlane: '质量与供应链', date: '2027-01-25', status: 'pending', subOffset: 30 }),
];

// ─── 所有节点汇总 ─────────────────────────────────────────────

const allNodes = [...gateNodes, ...activities, ...diamonds];

// ─── 连接线 ──────────────────────────────────────────────────────

function findNode(name) {
  const node = allNodes.find(n => n.name === name);
  if (!node) throw new Error(`Node not found: ${name}`);
  return node;
}

function makeConnection(sourceName, targetName, isCriticalPath = false, style = 'solid') {
  return {
    id: randomUUID(),
    sourceNodeId: findNode(sourceName).id,
    targetNodeId: findNode(targetName).id,
    style,
    isCriticalPath,
  };
}

const connections = [
  // ─── 关键路径（红线）：贯穿全流程 ───
  makeConnection('G10',              '产品定义书发布',     true),
  makeConnection('产品定义书发布',   '概念评审',           true),
  makeConnection('概念评审',         'G9',                 true),
  makeConnection('G9',               '零部件定点完成',     true),
  makeConnection('零部件定点完成',   '模具开发与验证',     true),
  makeConnection('模具开发与验证',   'G7',                 true),
  makeConnection('G7',               '造型数据发布',       true),
  makeConnection('造型数据发布',     '造型冻结评审',       true),
  makeConnection('造型冻结评审',     'G6',                 true),
  makeConnection('G6',               'B版材料清单',        true),
  makeConnection('B版材料清单',      'G4',                 true),
  makeConnection('G4',               '集采材料认可',       true),
  makeConnection('集采材料认可',     'CUBING回厂',         true),
  makeConnection('CUBING回厂',       'G3',                 true),
  makeConnection('G3',               'PPAP认可',           true),
  makeConnection('PPAP认可',         'G2',                 true),
  makeConnection('G2',               '量产审核',           true),
  makeConnection('量产审核',         'G1',                 true),
  makeConnection('G1',               'G0',                 true),
  makeConnection('G0',               'GTC',                true),

  // ─── 普通依赖（灰线） ───
  makeConnection('G10',              '外造型方案评审',     false),
  makeConnection('G10',              '项目启动与团队组建', false),
  makeConnection('项目启动与团队组建', '项目计划基线发布', false),
  makeConnection('G9',               '材料清单A版发布',    false),
  makeConnection('G9',               '内造型方案冻结',     false),
  makeConnection('G8',               '配置清单冻结',       false),
  makeConnection('G8',               '仿真验证完成',       false),
  makeConnection('配置清单冻结',     '方案确认评审',       false),
  makeConnection('方案确认评审',     '产品手册V2.0',       false),
  makeConnection('G7',               'CUBING定点完成',     false),
  makeConnection('G7',               'VR1.0软件发布',      false),
  makeConnection('内造型方案冻结',   '造型数据发布',       false),
  makeConnection('G6',               'APQP-2过程验证',     false),
  makeConnection('G6',               '产品手册V3.0锁定',   false),
  makeConnection('G6',               'A面数据冻结',        false),
  makeConnection('G6',               'SR1.0软件发布',      false),
  makeConnection('G6',               '阶段总结与风险更新', false),
  makeConnection('APQP-1质量策划',   'CUBING定点完成',     false),
  makeConnection('VR1.0软件发布',    '工程验证评审',       false),
  makeConnection('SR1.0软件发布',    '整车路试验证',       false),
  makeConnection('G4',               '工程验证评审',       false),
  makeConnection('产品手册V3.0锁定', 'SOP版产品手册',      false, 'dashed'),
  makeConnection('整车路试验证',     '量产合规认证',       false),
  makeConnection('量产合规认证',     '量产就绪评审',       false),
  makeConnection('量产就绪评审',     'G1',                 false),
];

// ─── 组装 ProjectData ──────────────────────────────────────────

const projectData = {
  schemaVersion: '1.0',
  id: randomUUID(),
  name: 'P7+ 中期改款',
  startDate: PROJECT_START.toISOString(),
  endDate: PROJECT_END.toISOString(),
  swimlanes,
  nodes: allNodes,
  connections,
  constraints: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── 统计 & 输出 ────────────────────────────────────────────────

const stats = {
  swimlanes: swimlanes.length,
  gates: gateNodes.length,
  activities: activities.length,
  diamonds: diamonds.length,
  totalNodes: allNodes.length,
  connections: connections.length,
  criticalPathConnections: connections.filter(c => c.isCriticalPath).length,
  completedNodes: allNodes.filter(n => n.status === 'completed').length,
  delayedNodes: allNodes.filter(n => n.status === 'delayed').length,
};

console.log('=== Demo Data Statistics ===');
console.log(`Swimlanes:   ${stats.swimlanes}`);
console.log(`Gates:       ${stats.gates}`);
console.log(`Activities:  ${stats.activities}`);
console.log(`Decisions:   ${stats.diamonds}`);
console.log(`Total Nodes: ${stats.totalNodes}`);
console.log(`Connections: ${stats.connections} (critical: ${stats.criticalPathConnections})`);
console.log(`Completed:   ${stats.completedNodes} | Delayed: ${stats.delayedNodes}`);

const outDir = join(PROJECT_ROOT, 'tmp');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'demo-showcase.json');
writeFileSync(outPath, JSON.stringify(projectData, null, 2), 'utf-8');
console.log(`\nOutput: ${outPath}`);
