import type { PlanNode, Connection, Swimlane, TimeConstraint } from '../types';
import { formatShortDate, generateTimelineUnits, formatTimelineUnit, groupMonthsByYear, getUnitWidth, dateToX } from './dateUtils';

/**
 * 转义 XML 特殊字符
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 将 Emoji 转换为 HTML 实体（需求13：修复Emoji导出黑块）
 */
function encodeEmoji(text: string): string {
  return Array.from(text).map(char => {
    const code = char.codePointAt(0);
    // 如果是 Emoji 或其他特殊字符（码点大于 127），转换为 HTML 实体
    if (code && code > 127) {
      return `&#${code};`;
    }
    return char;
  }).join('');
}

/**
 * 导出为DrawIO格式
 * DrawIO使用mxGraph XML格式
 * 需求12：移除日期底色（fillColor=none）
 * 需求13：修复Emoji导出黑块
 * 需求14：箭头样式一致性
 * 新增：时间轴导出和连接线优化
 * 问题11修复：确保导出有网格线
 */
export function exportToDrawio(
  projectName: string,
  nodes: PlanNode[],
  connections: Connection[],
  constraints: TimeConstraint[],  // 新增约束线
  swimlanes: Swimlane[],
  _monthWidth: number, // 不再使用，保留参数兼容性
  swimlaneHeight: number,
  startDate?: Date,
  endDate?: Date,
  timelineView: 'day' | 'week' | 'month' | 'quarter' = 'month'
): string {
  const YEAR_ROW_HEIGHT = 24;
  const UNIT_ROW_HEIGHT = 36;
  const HEADER_HEIGHT = YEAR_ROW_HEIGHT + UNIT_ROW_HEIGHT; // 60
  const LEFT_PANEL_WIDTH = 120;

  // 问题5/11修复：使用动态单位宽度
  const unitWidth = getUnitWidth(timelineView);

  // 生成时间轴单元
  const timelineUnits = startDate && endDate
    ? generateTimelineUnits(startDate, endDate, timelineView)
    : [];

  // 计算时间轴宽度
  const timelineWidth = timelineUnits.length * unitWidth;

  // 动态计算泳道宽度，确保所有节点都在泳道内
  const maxNodeX = nodes.length > 0
    ? Math.max(...nodes.map(n => n.x + (n.width || 50) / 2))
    : LEFT_PANEL_WIDTH + unitWidth * 12;
  const totalTimelineWidth = Math.max(timelineWidth, maxNodeX - LEFT_PANEL_WIDTH + 100, 800);

  // 生成唯一ID
  let idCounter = 2;
  const getId = () => String(idCounter++);

  // 节点ID映射
  const nodeIdMap = new Map<string, string>();

  // 构建mxCell列表
  const cells: string[] = [];

  // 根节点
  cells.push('<mxCell id="0"/>');
  cells.push('<mxCell id="1" parent="0"/>');

  // 添加时间轴表头（如果有时间轴数据）
  if (timelineUnits.length > 0 && startDate) {
    // 根据时间轴视图决定分组方式（与 PlannerCanvas.tsx 保持一致）
    if (timelineView === 'day' || timelineView === 'week') {
      // 天/周视图：按年月分组
      const yearMonthGroups = new Map<string, Date[]>();
      timelineUnits.forEach(unit => {
        const key = `${unit.getFullYear()}-${String(unit.getMonth() + 1).padStart(2, '0')}`;
        if (!yearMonthGroups.has(key)) {
          yearMonthGroups.set(key, []);
        }
        yearMonthGroups.get(key)!.push(unit);
      });

      let yearX = LEFT_PANEL_WIDTH;
      yearMonthGroups.forEach((units, key) => {
        const yearWidth = units.length * unitWidth;
        const yearId = getId();
        const [year, month] = key.split('-');
        const label = `${year}年${parseInt(month)}月`;
        cells.push(`
          <mxCell id="${yearId}" value="${label}" style="rounded=0;whiteSpace=wrap;html=1;strokeColor=#d2d2d7;fillColor=#f8f9fa;align=center;verticalAlign=middle;fontStyle=1;fontSize=11;" vertex="1" parent="1">
            <mxGeometry x="${yearX}" y="0" width="${yearWidth}" height="${YEAR_ROW_HEIGHT}" as="geometry"/>
          </mxCell>
        `);
        yearX += yearWidth;
      });
    } else {
      // 月/季视图：按年份分组（原有逻辑）
      const yearGroups = groupMonthsByYear(timelineUnits);

      // 年份行
      let yearX = LEFT_PANEL_WIDTH;
      yearGroups.forEach((units, year) => {
        const yearWidth = units.length * unitWidth;
        const yearId = getId();
        cells.push(`
          <mxCell id="${yearId}" value="${year}年" style="rounded=0;whiteSpace=wrap;html=1;strokeColor=#d2d2d7;fillColor=#f8f9fa;align=center;verticalAlign=middle;fontStyle=1;fontSize=11;" vertex="1" parent="1">
            <mxGeometry x="${yearX}" y="0" width="${yearWidth}" height="${YEAR_ROW_HEIGHT}" as="geometry"/>
          </mxCell>
        `);
        yearX += yearWidth;
      });
    }

    // 月份/周/日行 - 添加网格线边框
    timelineUnits.forEach((unit, index) => {
      const unitX = LEFT_PANEL_WIDTH + index * unitWidth;
      const unitId = getId();
      const unitLabel = formatTimelineUnit(unit, timelineView);
      cells.push(`
        <mxCell id="${unitId}" value="${unitLabel}" style="rounded=0;whiteSpace=wrap;html=1;strokeColor=#e5e7eb;fillColor=#ffffff;align=center;verticalAlign=middle;fontSize=10;" vertex="1" parent="1">
          <mxGeometry x="${unitX}" y="${YEAR_ROW_HEIGHT}" width="${unitWidth}" height="${UNIT_ROW_HEIGHT}" as="geometry"/>
        </mxCell>
      `);
    });

    // 问题11修复：为泳道区域的每个时间单元格添加网格线
    swimlanes.forEach((_, swimlaneIndex) => {
      const swimlaneY = HEADER_HEIGHT + swimlaneIndex * swimlaneHeight;
      timelineUnits.forEach((_, unitIndex) => {
        const unitX = LEFT_PANEL_WIDTH + unitIndex * unitWidth;
        const gridCellId = getId();
        cells.push(`
          <mxCell id="${gridCellId}" value="" style="rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#e5e7eb;" vertex="1" parent="1">
            <mxGeometry x="${unitX}" y="${swimlaneY}" width="${unitWidth}" height="${swimlaneHeight}" as="geometry"/>
          </mxCell>
        `);
      });
    });

    // 项目名称左上角 - 根据字数动态调整字号
    const projectNameId = getId();
    const projectFontSize = projectName.length > 20 ? 10 : 12;
    cells.push(`
      <mxCell id="${projectNameId}" value="${escapeXml(projectName)}" style="rounded=0;whiteSpace=wrap;html=1;strokeColor=#d2d2d7;fillColor=#f5f5f5;align=center;verticalAlign=middle;fontStyle=1;fontSize=${projectFontSize};" vertex="1" parent="1">
        <mxGeometry x="0" y="0" width="${LEFT_PANEL_WIDTH}" height="${HEADER_HEIGHT}" as="geometry"/>
      </mxCell>
    `);
  }

  // 添加泳道（名称在左侧）
  swimlanes.forEach((swimlane, index) => {
    const y = HEADER_HEIGHT + index * swimlaneHeight;

    // 泳道名称（左侧独立文本框）- 根据字数动态调整字号
    const nameId = getId();
    const swimlaneFontSize = swimlane.name.length > 15 ? 10 : 12;
    cells.push(`
      <mxCell id="${nameId}" value="${escapeXml(swimlane.name)}" style="rounded=0;whiteSpace=wrap;html=1;strokeColor=#d2d2d7;fillColor=#f5f5f5;align=center;verticalAlign=middle;fontSize=${swimlaneFontSize};" vertex="1" parent="1">
        <mxGeometry x="0" y="${y}" width="${LEFT_PANEL_WIDTH}" height="${swimlaneHeight}" as="geometry"/>
      </mxCell>
    `);

    // 泳道背景区域 - 使用动态宽度
    const swimlaneId = getId();
    cells.push(`
      <mxCell id="${swimlaneId}" value="" style="rounded=0;whiteSpace=wrap;html=1;fillColor=${index % 2 === 0 ? '#ffffff' : '#fafafa'};strokeColor=#e5e7eb;" vertex="1" parent="1">
        <mxGeometry x="${LEFT_PANEL_WIDTH}" y="${y}" width="${totalTimelineWidth}" height="${swimlaneHeight}" as="geometry"/>
      </mxCell>
    `);
  });

  // 添加节点（包含日期显示）
  // 辅助函数：计算节点的实际导出 X 坐标
  const getNodeExportX = (node: PlanNode) => {
    const nodeWidth = node.type === 'rectangle' ? (node.width || 100) : 40;
    if (node.type === 'rectangle') {
      // 长方形节点：使用开始日期计算左边缘，然后加上宽度的一半
      const leftEdgeX = dateToX(node.date, startDate!, unitWidth, LEFT_PANEL_WIDTH, timelineView);
      return leftEdgeX + nodeWidth / 2;
    } else {
      // 其他节点：直接使用日期计算中心点
      return dateToX(node.date, startDate!, unitWidth, LEFT_PANEL_WIDTH, timelineView);
    }
  };

  nodes.forEach((node) => {
    const cellId = getId();
    nodeIdMap.set(node.id, cellId);

    let style = '';
    let width = 40;
    let height = 40;

    // 格式化日期文本（放在节点上方单独标签，不在节点内）
    const dateStr = formatShortDate(node.date);

    switch (node.type) {
      case 'diamond':
        // 菱形：使用 mxgraph 标准菱形样式
        style = `shape=rhombus;perimeter=rhombusPerimeter;whiteSpace=wrap;html=1;fillColor=${node.color};strokeColor=${node.color};fontColor=#ffffff;fontSize=9;`;
        width = 50;
        height = 50;
        break;
      case 'triangle':
        // 第二轮修复：使用自定义路径绘制底边水平的等边三角形
        // mxgraph.basic.acute_triangle 可以生成底边水平的三角形
        style = `shape=mxgraph.basic.acute_triangle;whiteSpace=wrap;html=1;fillColor=${node.color};strokeColor=${node.color};fontColor=#ffffff;fontSize=9;dx=0.5;`;
        width = 40;
        height = 35;
        break;
      case 'rectangle':
        style = `rounded=1;whiteSpace=wrap;html=1;fillColor=${node.color};strokeColor=${node.color};fontColor=#ffffff;fontSize=10;arcSize=20;`;
        width = node.width || 100;
        height = 32;
        break;
      case 'star':
        style = `shape=mxgraph.basic.star;whiteSpace=wrap;html=1;fillColor=${node.color};strokeColor=${node.color};`;
        width = 50;
        height = 50;
        break;
      case 'circle':
        style = `ellipse;whiteSpace=wrap;html=1;fillColor=${node.color};strokeColor=${node.color};fontColor=#ffffff;fontSize=9;`;
        width = 40;
        height = 40;
        break;
      case 'hexagon':
        style = `shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fillColor=${node.color};strokeColor=${node.color};fontColor=#ffffff;fontSize=9;`;
        width = 50;
        height = 45;
        break;
      case 'emoji':
        // 需求13：使用HTML实体编码Emoji，避免黑块
        style = `text;html=1;align=center;verticalAlign=middle;fontSize=24;fillColor=none;strokeColor=none;`;
        width = 40;
        height = 40;
        break;
      default:
        style = `ellipse;whiteSpace=wrap;html=1;fillColor=${node.color};strokeColor=${node.color};`;
        width = 40;
        height = 40;
    }

    // 关键修复：根据日期重新计算 X 坐标，确保与时间轴对齐
    const nodeX = startDate ? getNodeExportX(node) : node.x;
    const x = nodeX - width / 2;
    const y = node.y - height / 2;

    // 节点主体（不包含日期文本）
    if (node.type === 'emoji') {
      cells.push(`
      <mxCell id="${cellId}" value="${encodeEmoji(node.emoji || '😀')}" style="${style}" vertex="1" parent="1">
        <mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry"/>
      </mxCell>
    `);
    } else {
      cells.push(`
      <mxCell id="${cellId}" value="" style="${style}" vertex="1" parent="1">
        <mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry"/>
      </mxCell>
    `);
    }

    // 日期标签（在节点上方，无底色）
    const dateLabelId = getId();
    let dateLabelText = dateStr;
    if (node.type === 'rectangle' && node.endDate) {
      dateLabelText = `${formatShortDate(node.date)}-${formatShortDate(node.endDate)}`;
    }
    cells.push(`
      <mxCell id="${dateLabelId}" value="${escapeXml(dateLabelText)}" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=bottom;whiteSpace=wrap;rounded=0;fontSize=9;fontColor=#666666;" vertex="1" parent="1">
        <mxGeometry x="${x - 10}" y="${y - 18}" width="${width + 20}" height="16" as="geometry"/>
      </mxCell>
    `);

    // 节点名称标签（在节点下方）- 需求12：移除底色
    const labelId = getId();
    cells.push(`
      <mxCell id="${labelId}" value="${escapeXml(node.name)}" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=top;whiteSpace=wrap;rounded=0;fontSize=11;" vertex="1" parent="1">
        <mxGeometry x="${x - 20}" y="${y + height + 3}" width="${width + 40}" height="20" as="geometry"/>
      </mxCell>
    `);
  });

  // 添加连接线 - 使用直角折线样式，箭头指向节点边缘中点
  connections.forEach((conn) => {
    const sourceId = nodeIdMap.get(conn.sourceNodeId);
    const targetId = nodeIdMap.get(conn.targetNodeId);

    if (sourceId && targetId) {
      const connId = getId();

      // 获取源节点和目标节点，计算连线方向
      const sourceNode = nodes.find(n => n.id === conn.sourceNodeId);
      const targetNode = nodes.find(n => n.id === conn.targetNodeId);

      // 使用 orthogonalEdgeStyle 实现直角折线
      let style = 'edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;html=1;jettySize=auto;';

      // 根据节点位置设置箭头的出口和入口点（使用重新计算的坐标）
      // exitX/exitY: 从源节点的哪个位置出发 (0=左, 0.5=中, 1=右)
      // entryX/entryY: 到达目标节点的哪个位置 (0=左, 0.5=中, 1=右)
      if (sourceNode && targetNode && startDate) {
        const sourceX = getNodeExportX(sourceNode);
        const targetX = getNodeExportX(targetNode);
        if (targetX > sourceX) {
          // 目标在源的右侧：从右边出，到左边进
          style += 'exitX=1;exitY=0.5;entryX=0;entryY=0.5;';
        } else {
          // 目标在源的左侧：从左边出，到右边进
          style += 'exitX=0;exitY=0.5;entryX=1;entryY=0.5;';
        }
      } else {
        // 默认设置
        style += 'exitX=1;exitY=0.5;entryX=0;entryY=0.5;';
      }

      style += 'endArrow=classic;endFill=1;endSize=8;'; // 统一箭头样式

      // 关键路径使用红色
      if (conn.isCriticalPath) {
        style += 'strokeColor=#FF3B30;strokeWidth=3;';
      } else if (conn.color) {
        style += `strokeColor=${conn.color};`;
      } else {
        style += 'strokeColor=#374151;';
      }

      // 根据线条样式设置
      if (conn.style === 'dashed') {
        style += 'dashed=1;dashPattern=8 4;';
      } else if (conn.style === 'dotted') {
        style += 'dashed=1;dashPattern=2 4;';
      }

      cells.push(`
        <mxCell id="${connId}" style="${style}" edge="1" parent="1" source="${sourceId}" target="${targetId}">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
      `);
    }
  });

  // 添加约束线（虚线，无箭头）
  constraints.forEach((constraint) => {
    const sourceId = nodeIdMap.get(constraint.sourceNodeId);
    const targetId = nodeIdMap.get(constraint.targetNodeId);

    if (sourceId && targetId) {
      const constraintId = getId();

      // 约束线样式：虚线，橙色，无箭头
      let style = 'edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;html=1;jettySize=auto;';
      style += 'strokeColor=#f97316;strokeWidth=2;';  // 橙色
      style += 'dashed=1;dashPattern=6 4;';           // 虚线
      style += 'endArrow=none;';                      // 无箭头

      // 方向判断（使用重新计算的坐标）
      const sourceNode = nodes.find(n => n.id === constraint.sourceNodeId);
      const targetNode = nodes.find(n => n.id === constraint.targetNodeId);
      if (sourceNode && targetNode && startDate) {
        const sourceX = getNodeExportX(sourceNode);
        const targetX = getNodeExportX(targetNode);
        if (targetX > sourceX) {
          style += 'exitX=1;exitY=0.5;entryX=0;entryY=0.5;';
        } else {
          style += 'exitX=0;exitY=0.5;entryX=1;entryY=0.5;';
        }
      }

      cells.push(`
        <mxCell id="${constraintId}" style="${style}" edge="1" parent="1" source="${sourceId}" target="${targetId}">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
      `);
    }
  });

  // 组装完整的DrawIO XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="ProjectPlanner" version="1.0" type="device">
  <diagram name="${escapeXml(projectName)}" id="project-plan">
    <mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827">
      <root>
        ${cells.join('\n')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

  return xml;
}

/**
 * 复制画布为图片
 */
export async function copyCanvasAsImage(stage: any): Promise<void> {
  try {
    const dataUrl = stage.toDataURL({ pixelRatio: 2 });
    const blob = await (await fetch(dataUrl)).blob();
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
  } catch (error) {
    console.error('复制图片失败:', error);
    throw error;
  }
}

/**
 * 下载文件
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 读取文件内容
 */
export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
