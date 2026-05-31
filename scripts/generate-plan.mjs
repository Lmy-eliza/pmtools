#!/usr/bin/env node
/**
 * plan-generator 核心脚本
 * 读取飞书 Base → 倒排计算 → 输出 ProjectData JSON
 *
 * 用法: node scripts/generate-plan.mjs --name "P7+全新换代" --scale 全新 --sop 2028-06-01
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { randomUUID } from 'crypto';

// ─── 常量 ───
const BASE_TOKEN = 'YXtcb43qOaTLLVsI1FGc1ZXFnUb';
const TABLES = {
  activities: 'tblb3VeOmziHd6SJ',
  dependencies: 'tbli5zBwZHiqmjIT',
  gates: 'tblbEit1yZPEmhOv',
  swimlanes: 'tblhTrgNYilxOYQY',
};

const MONTH_WIDTH = 200;
const SWIMLANE_HEIGHT = 120;
const HEADER_HEIGHT = 60;
const NODE_VERTICAL_GAP = 35;

const SCALE_TO_GATE_FIELD = {
  '平台首发': '平台首发&全新-距SOP月数',
  '全新':     '平台首发&全新-距SOP月数',
  '中改':     '中改-距SOP月数',
  '小改':     '小改-距SOP月数',
  '海外':     '海外-距SOP月数',
};

const SWIMLANE_COLOR_MAP = {
  '管理': '#007AFF',
  '工程': '#32ADE6',
  '造型': '#AF52DE',
  '零部件': '#FF9500',
  '电子': '#FF6B6B',
  '智能': '#5856D6',
  '验证': '#34C759',
  '供应链': '#FF3B30',
  '质量': '#FFCC00',
  '制造': '#8E8E93',
  '法规': '#00C7BE',
  '服务': '#30B0C7',
};

// 阀点节点类型映射（保留 pentagon）
const GATE_NODE_TYPE_MAP = {
  '矩条形（普通活动）': 'rectangle',
  '菱形（决策/评审节点）': 'diamond',
  '五边形（里程碑）': 'pentagon',
};

// 活动节点类型映射（里程碑 → 菱形，五边形仅用于阀点）
const ACTIVITY_NODE_TYPE_MAP = {
  '矩条形（普通活动）': 'rectangle',
  '菱形（决策/评审节点）': 'diamond',
  '五边形（里程碑）': 'diamond',
};

// ─── CLI 参数解析 ───
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    params[key] = args[i + 1];
  }
  if (!params.name || !params.scale || !params.sop) {
    console.error('用法: node scripts/generate-plan.mjs --name "项目名" --scale 全新 --sop 2028-06-01');
    console.error('scale 可选: 平台首发 | 全新 | 中改 | 小改 | 海外');
    process.exit(1);
  }
  return params;
}

// ─── 飞书 API 读取 ───
function larkQuery(tableId, fieldIds, limit = 200, offset = 0) {
  const fieldArgs = fieldIds.map(f => `--field-id "${f}"`).join(' ');
  const cmd = `npx lark-cli base +record-list --as user --base-token ${BASE_TOKEN} --table-id ${tableId} ${fieldArgs} --limit ${limit} --offset ${offset} --format json`;
  const result = execSync(cmd, { cwd: process.cwd(), encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  return JSON.parse(result);
}

function readAllRecords(tableId, fieldIds) {
  let all = [];
  let offset = 0;
  let fields = null;
  while (true) {
    const resp = larkQuery(tableId, fieldIds, 200, offset);
    if (!resp.ok) throw new Error(`API error: ${JSON.stringify(resp.error)}`);
    if (!fields) fields = resp.data.fields;
    all = all.concat(resp.data.data);
    if (!resp.data.has_more) break;
    offset += 200;
  }
  return { records: all, fields };
}

function recordsToObjects(records, fields) {
  return records.map(row => {
    const obj = {};
    fields.forEach((f, i) => {
      let val = row[i];
      if (Array.isArray(val) && val.length === 1) val = val[0];
      obj[f] = val;
    });
    return obj;
  });
}

// ─── 数据读取 ───
function readGates(scale) {
  console.log('  读取阀点定义表...');
  const gateField = SCALE_TO_GATE_FIELD[scale];
  if (!gateField) throw new Error(`未知车型规模: ${scale}`);

  const { records, fields } = readAllRecords(TABLES.gates, [
    '阀点名称', '英文名', gateField, '默认颜色', '节点类型', '含义',
  ]);
  const gates = recordsToObjects(records, fields);

  return gates
    .filter(g => g[gateField] != null)
    .map(g => ({
      name: g['阀点名称'],
      englishName: g['英文名'],
      monthsFromSOP: g[gateField],
      color: g['默认颜色'] || '#64D2FF',
      nodeType: GATE_NODE_TYPE_MAP[g['节点类型']] || 'pentagon',
      description: g['含义'],
    }));
}

function readSwimlanes(scale) {
  console.log('  读取甬道定义表...');
  const { records, fields } = readAllRecords(TABLES.swimlanes, [
    '甬道名称', '甬道序号', '分类', '适用项目规模',
  ]);
  const swimlanes = recordsToObjects(records, fields);

  return swimlanes
    .filter(s => {
      const scales = Array.isArray(s['适用项目规模']) ? s['适用项目规模'] : [s['适用项目规模']];
      return scales.includes(scale);
    })
    .sort((a, b) => a['甬道序号'] - b['甬道序号'])
    .map(s => ({
      name: s['甬道名称'],
      order: s['甬道序号'],
      category: Array.isArray(s['分类']) ? s['分类'][0] : s['分类'],
    }));
}

function readActivities(scale) {
  console.log('  读取活动模板表（可能需要分页）...');
  const { records, fields } = readAllRecords(TABLES.activities, [
    '活动ID', '活动名称', '适用项目规模', '所属阀点', '所属甬道',
    '结束周', '活动周期（周）', '节点类型', '是否启用', '默认颜色', '是否关键路径',
  ]);
  console.log(`  总记录数: ${records.length}`);
  const activities = recordsToObjects(records, fields);

  const filtered = activities.filter(a => {
    const scales = Array.isArray(a['适用项目规模']) ? a['适用项目规模'] : [a['适用项目规模']];
    const enabled = a['是否启用'] === '启用';
    return scales.includes(scale) && enabled;
  });
  console.log(`  筛选后（${scale} + 启用）: ${filtered.length} 条`);

  return filtered.map(a => ({
    id: a['活动ID'],
    name: a['活动名称'],
    gate: a['所属阀点'],
    swimlane: a['所属甬道'],
    endWeek: a['结束周'],
    durationWeeks: a['活动周期（周）'],
    nodeType: ACTIVITY_NODE_TYPE_MAP[a['节点类型']] || 'rectangle',
    color: a['默认颜色'],
    isCriticalPath: a['是否关键路径'] === '是',
  }));
}

// ─── 日期计算 ───
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  return d;
}

function daysBetween(d1, d2) {
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

function toISO(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, '.000Z');
}

function dateToX(date, projectStart) {
  const days = daysBetween(projectStart, date);
  return Math.round(days * (MONTH_WIDTH / 30));
}

// ─── JSON 生成 ───
function generateProjectData({ name, scale, sopDateStr }) {
  const sopDate = new Date(sopDateStr + 'T00:00:00.000Z');

  console.log(`\n生成项目计划: ${name}`);
  console.log(`车型规模: ${scale}, SOP: ${sopDateStr}\n`);

  // Step 1: 读数据
  const gatesData = readGates(scale);
  const swimlanesData = readSwimlanes(scale);
  const activitiesData = readActivities(scale);

  // Step 2: 计算阀点绝对日期
  const gateMap = {};
  gatesData.forEach(g => {
    g.absoluteDate = addMonths(sopDate, g.monthsFromSOP);
    gateMap[g.name] = g;
  });

  // 项目起止日期
  const allGateDates = gatesData.map(g => g.absoluteDate);
  const projectStart = new Date(Math.min(...allGateDates));
  const projectEnd = new Date(Math.max(...allGateDates));

  console.log(`\n项目周期: ${projectStart.toISOString().slice(0, 10)} → ${projectEnd.toISOString().slice(0, 10)}`);
  console.log(`阀点: ${gatesData.length} 个`);
  console.log(`甬道: ${swimlanesData.length} 个`);
  console.log(`活动: ${activitiesData.length} 个\n`);

  // Step 3: 构建 swimlanes
  const swimlaneIdMap = {};
  const swimlanes = swimlanesData.map((s, i) => {
    const id = randomUUID();
    swimlaneIdMap[s.name] = { id, order: i, category: s.category };
    return {
      id,
      name: s.name,
      order: i,
      isCollapsed: false,
    };
  });

  // Step 4: 构建 nodes
  const nodes = [];

  // 4a: 阀点节点（放在第一个甬道）
  const firstSwimId = swimlanes[0]?.id;
  gatesData.forEach(g => {
    const x = dateToX(g.absoluteDate, projectStart);
    nodes.push({
      id: randomUUID(),
      type: g.nodeType,
      name: g.name,
      color: g.color,
      x,
      y: HEADER_HEIGHT + 30,
      date: toISO(g.absoluteDate),
      swimlaneId: firstSwimId,
    });
  });

  // 4b: 活动节点 — 分两轮布局
  // 第一轮：矩形活动（线段），从 baseY 向下堆叠
  // 第二轮：菱形里程碑，放在活动上方空白处，碰撞检测错开
  const swimlaneRectCount = {};
  const swimlaneDiamonds = {};

  // 预处理：分离矩形和菱形
  const rectActivities = [];
  const diamondActivities = [];
  activitiesData.forEach(act => {
    const gate = gateMap[act.gate];
    if (!gate) return;
    const swim = swimlaneIdMap[act.swimlane];
    if (!swim) return;

    const gateDate = gate.absoluteDate;
    const endDate = addDays(gateDate, act.endWeek * 7);
    const startDate = addDays(endDate, -act.durationWeeks * 7);
    const x = dateToX(startDate, projectStart);
    const color = act.color || SWIMLANE_COLOR_MAP[swim.category] || '#32ADE6';

    const prepared = { act, swim, startDate, endDate, x, color };
    if (act.nodeType === 'rectangle') {
      rectActivities.push(prepared);
    } else {
      diamondActivities.push(prepared);
    }
  });

  // 第一轮：矩形活动
  rectActivities.forEach(({ act, swim, startDate, endDate, x, color }) => {
    const baseY = HEADER_HEIGHT + swim.order * SWIMLANE_HEIGHT + 40;
    swimlaneRectCount[act.swimlane] = (swimlaneRectCount[act.swimlane] || 0) + 1;
    const verticalOffset = (swimlaneRectCount[act.swimlane] - 1) * NODE_VERTICAL_GAP;
    const y = baseY + verticalOffset;

    const width = Math.max(40, dateToX(endDate, projectStart) - x);
    nodes.push({
      id: randomUUID(),
      type: 'rectangle',
      name: act.name,
      color,
      x,
      y,
      date: toISO(startDate),
      endDate: toISO(endDate),
      width,
      swimlaneId: swim.id,
    });
  });

  // 第二轮：菱形节点 — 优先放活动上方，上方满则放下方
  const DIAMOND_MIN_X_GAP = 80;
  const DIAMOND_ROW_HEIGHT = 28;
  diamondActivities.forEach(({ act, swim, startDate, x, color }) => {
    const swimTop = HEADER_HEIGHT + swim.order * SWIMLANE_HEIGHT;
    const aboveBaseY = swimTop + 20;
    const rectCount = swimlaneRectCount[act.swimlane] || 0;
    const belowBaseY = HEADER_HEIGHT + swim.order * SWIMLANE_HEIGHT + 40 + rectCount * NODE_VERTICAL_GAP + 10;

    if (!swimlaneDiamonds[act.swimlane]) swimlaneDiamonds[act.swimlane] = [];
    const placed = swimlaneDiamonds[act.swimlane];

    let y = aboveBaseY;
    let row = 0;
    while (placed.some(p => p.row === row && Math.abs(p.x - x) < DIAMOND_MIN_X_GAP)) {
      row++;
      y = aboveBaseY - (row * DIAMOND_ROW_HEIGHT);
    }

    // 如果上方超出泳道顶部边界，放到活动下方
    if (y < swimTop + 5) {
      row = -1;
      let belowRow = 0;
      y = belowBaseY;
      while (placed.some(p => p.row === -(belowRow + 1) && Math.abs(p.x - x) < DIAMOND_MIN_X_GAP)) {
        belowRow++;
        y = belowBaseY + belowRow * DIAMOND_ROW_HEIGHT;
      }
      row = -(belowRow + 1);
    }
    placed.push({ x, row });

    nodes.push({
      id: randomUUID(),
      type: act.nodeType,
      name: act.name,
      color,
      x,
      y,
      date: toISO(startDate),
      swimlaneId: swim.id,
    });
  });

  // Step 5: 构建完整 JSON
  const now = toISO(new Date());
  const projectData = {
    schemaVersion: '1.0',
    id: randomUUID(),
    name,
    startDate: toISO(projectStart),
    endDate: toISO(projectEnd),
    swimlanes,
    nodes,
    connections: [],
    constraints: [],
    createdAt: now,
    updatedAt: now,
  };

  return projectData;
}

// ─── Main ───
const params = parseArgs();
const projectData = generateProjectData({
  name: params.name,
  scale: params.scale,
  sopDateStr: params.sop,
});

// 输出文件
const outputPath = params.output || `D:\\claude_learning\\tmp\\plan_${params.scale}_${params.sop}.json`;
writeFileSync(outputPath, JSON.stringify(projectData, null, 2), 'utf-8');
console.log(`\n✅ ProjectData JSON 已保存: ${outputPath}`);
console.log(`   节点数: ${projectData.nodes.length}`);
console.log(`   甬道数: ${projectData.swimlanes.length}`);
console.log(`\n导入方式: 在 Smart Planner 中点击 ⋯ → 粘贴 JSON`);
