import type { PlanNode, Connection } from '../types';

/**
 * 关键路径计算工具
 * 需求20：自动计算关键路径，支持手动调整
 * 第二轮修复：重写算法 - 按日期排序节点，跳过被长方形活动严格包含的节点
 */

/**
 * 计算关键路径（第二轮修复：新算法）
 * 算法逻辑：
 * 1. 按日期排序所有节点（长方形用起始日期）
 * 2. 从最早节点开始，依次连接到最晚节点
 * 3. 跳过规则：如果节点X的日期严格在某个长方形活动的起止时间范围内（开始日期 < X日期 < 结束日期），则跳过节点X
 * 4. 边界情况：如果节点日期等于活动的开始或结束日期，不跳过
 * 5. 为路径上的连接线创建并标记为关键路径（红色）
 *
 * @param nodes 所有节点
 * @param connections 所有连接（此参数保留但不再使用，算法直接基于节点日期）
 * @returns 需要创建的关键路径连接信息列表
 */
export function calculateCriticalPath(
  nodes: PlanNode[],
  _connections: Connection[]
): CriticalPathConnection[] {
  if (nodes.length === 0) {
    return [];
  }

  // 1. 获取所有长方形活动的时间范围
  const rectangleRanges = nodes
    .filter(n => n.type === 'rectangle' && n.endDate)
    .map(n => ({
      start: n.date,
      end: n.endDate as Date,
      node: n
    }));

  // 2. 判断节点是否被某个活动严格包含
  const isContained = (node: PlanNode): boolean => {
    // 活动本身不被跳过
    if (node.type === 'rectangle') return false;

    return rectangleRanges.some(range => {
      const nodeTime = node.date.getTime();
      const startTime = range.start.getTime();
      const endTime = range.end.getTime();
      // 严格包含：开始日期 < 节点日期 < 结束日期
      return startTime < nodeTime && nodeTime < endTime;
    });
  };

  // 3. 过滤出不被包含的节点，按日期排序
  const pathNodes = nodes
    .filter(n => !isContained(n))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // 4. 依次连接相邻节点，创建关键路径连接信息
  const criticalConnections: CriticalPathConnection[] = [];
  for (let i = 0; i < pathNodes.length - 1; i++) {
    criticalConnections.push({
      sourceId: pathNodes[i].id,
      targetId: pathNodes[i + 1].id,
      isCriticalPath: true
    });
  }

  return criticalConnections;
}

/**
 * 关键路径连接信息
 */
export interface CriticalPathConnection {
  sourceId: string;
  targetId: string;
  isCriticalPath: boolean;
}

/**
 * 更新连接的关键路径标记（旧版兼容）
 * @param connections 所有连接
 * @param criticalPathIds 关键路径连接ID列表
 * @returns 更新后的连接列表
 */
export function markCriticalPath(
  connections: Connection[],
  criticalPathIds: string[]
): Connection[] {
  const criticalSet = new Set(criticalPathIds);
  return connections.map(conn => ({
    ...conn,
    isCriticalPath: criticalSet.has(conn.id),
  }));
}

/**
 * 应用关键路径计算结果到连接列表
 * 第二轮修复：新函数 - 根据计算结果更新或创建连接
 * @param connections 现有连接列表
 * @param criticalPathConnections 关键路径连接信息
 * @param addConnection 添加连接的函数
 * @returns 更新后的连接列表
 */
export function applyCriticalPathConnections(
  connections: Connection[],
  criticalPathConnections: CriticalPathConnection[]
): Connection[] {
  // 首先清除所有连接的关键路径标记
  const updatedConnections = connections.map(conn => ({
    ...conn,
    isCriticalPath: false
  }));

  // 为关键路径中的每对节点标记现有连接或创建标记需求
  const connectionMap = new Map<string, number>();
  updatedConnections.forEach((conn, index) => {
    const key1 = `${conn.sourceNodeId}-${conn.targetNodeId}`;
    const key2 = `${conn.targetNodeId}-${conn.sourceNodeId}`;
    connectionMap.set(key1, index);
    connectionMap.set(key2, index);
  });

  criticalPathConnections.forEach(cp => {
    const key = `${cp.sourceId}-${cp.targetId}`;
    const index = connectionMap.get(key);
    if (index !== undefined) {
      updatedConnections[index].isCriticalPath = true;
    }
  });

  return updatedConnections;
}

/**
 * 获取需要新建的关键路径连接
 * @param connections 现有连接列表
 * @param criticalPathConnections 关键路径连接信息
 * @returns 需要新建的连接信息
 */
export function getNewCriticalPathConnections(
  connections: Connection[],
  criticalPathConnections: CriticalPathConnection[]
): CriticalPathConnection[] {
  // 构建现有连接的映射
  const existingConnections = new Set<string>();
  connections.forEach(conn => {
    existingConnections.add(`${conn.sourceNodeId}-${conn.targetNodeId}`);
    existingConnections.add(`${conn.targetNodeId}-${conn.sourceNodeId}`);
  });

  // 找出需要新建的连接
  return criticalPathConnections.filter(cp => {
    const key = `${cp.sourceId}-${cp.targetId}`;
    return !existingConnections.has(key);
  });
}
