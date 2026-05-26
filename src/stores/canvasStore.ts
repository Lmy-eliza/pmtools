import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { addMonths } from 'date-fns';
import type {
  PlanNode,
  Connection,
  TimeConstraint,
  Swimlane,
  CanvasSettings,
  ToolType,
  ConnectionPathConfig
} from '../types';

interface CanvasState {
  // 项目信息
  projectName: string;
  setProjectName: (name: string) => void;

  // 时间范围
  startDate: Date;
  endDate: Date;
  setDateRange: (start: Date, end: Date) => void;
  setStartDate: (date: Date) => void;
  setEndDate: (date: Date) => void;

  // 泳道
  swimlanes: Swimlane[];
  addSwimlane: (name?: string) => void;
  updateSwimlane: (id: string, updates: Partial<Swimlane>) => void;
  deleteSwimlane: (id: string) => void;
  reorderSwimlanes: (swimlanes: Swimlane[]) => void;

  // 节点
  nodes: PlanNode[];
  selectedNodeIds: string[];
  addNode: (node: Omit<PlanNode, 'id'>) => string;
  updateNode: (id: string, updates: Partial<PlanNode>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string, multi?: boolean) => void;
  clearSelection: () => void;

  // 连接线
  connections: Connection[];
  selectedConnectionIds: string[];  // 问题14：选中的连接线IDs（支持多选）
  connectionStyle: 'simple' | 'critical';  // 问题10：当前连接线样式
  addConnection: (sourceId: string, targetId: string, style?: 'solid' | 'dashed', isCriticalPath?: boolean) => string | null;
  updateConnection: (id: string, updates: Partial<Connection>) => void;  // 更新连接线
  updateConnectionPath: (id: string, pathConfig: ConnectionPathConfig) => void;  // 更新连接线路径
  updateConnectionLabelOffset: (id: string, offset: { x: number; y: number }) => void;  // 更新连接线标签偏移
  deleteConnection: (id: string) => void;
  deleteSelectedConnections: () => void;  // 问题14：批量删除
  selectConnection: (id: string | null, multi?: boolean) => void;  // 问题14：支持多选
  setConnectionStyle: (style: 'simple' | 'critical') => void;  // 问题10：设置连接线样式
  toggleConnectionCriticalPath: (id: string) => void; // 切换关键路径

  // 时间约束
  constraints: TimeConstraint[];
  selectedConstraintId: string | null;  // 问题11：选中的约束ID
  addConstraint: (sourceId: string, targetId: string, offsetMonths: number) => string | null;
  updateConstraint: (id: string, updates: Partial<TimeConstraint>) => void;
  updateConstraintLabelOffset: (id: string, offset: { x: number; y: number }) => void;  // 更新约束线标签偏移
  deleteConstraint: (id: string) => void;
  selectConstraint: (id: string | null) => void;  // 问题11：选中约束
  applyConstraints: (movedNodeId: string) => void;

  // 画布设置
  settings: CanvasSettings;
  updateSettings: (updates: Partial<CanvasSettings>) => void;

  // 当前工具
  currentTool: ToolType;
  setCurrentTool: (tool: ToolType) => void;

  // 当前 Emoji（用于 emoji 节点）
  currentEmoji: string;
  setCurrentEmoji: (emoji: string) => void;

  // 泳道冻结
  frozenSwimlaneCount: number;
  setFrozenSwimlaneCount: (count: number) => void;

  // 连线模式
  connectionStart: string | null;
  setConnectionStart: (nodeId: string | null) => void;

  // 撤销/重做
  history: { nodes: PlanNode[]; connections: Connection[]; constraints: TimeConstraint[] }[];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // 重置
  resetProject: () => void;
}

const defaultSettings: CanvasSettings = {
  zoom: 1,
  panX: 0,
  panY: 0,
  monthWidth: 100,
  swimlaneHeight: 120,
  showConstraints: true,
  showIntervals: false,
  intervalUnit: 'month',
  intervalDecimals: 0,
  timelineView: 'month',
  autoLinkUnit: true,
};

const createDefaultSwimlanes = (): Swimlane[] => [
  { id: uuidv4(), name: '软件开发', order: 0, isCollapsed: false },
  { id: uuidv4(), name: '硬件开发', order: 1, isCollapsed: false },
  { id: uuidv4(), name: '测试验证', order: 2, isCollapsed: false },
];

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // 项目信息
  projectName: 'XX项目',
  setProjectName: (name) => set({ projectName: name }),

  // 时间范围（默认当前年月开始，往后18个月）
  startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  endDate: addMonths(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 18),
  setDateRange: (start, end) => set({ startDate: start, endDate: end }),
  setStartDate: (date) => set({ startDate: date }),
  setEndDate: (date) => set({ endDate: date }),

  // 泳道
  swimlanes: createDefaultSwimlanes(),
  addSwimlane: (name) => {
    const { swimlanes } = get();
    const newSwimlane: Swimlane = {
      id: uuidv4(),
      name: name || `泳道${swimlanes.length + 1}`,
      order: swimlanes.length,
      isCollapsed: false,
    };
    set({ swimlanes: [...swimlanes, newSwimlane] });
  },
  updateSwimlane: (id, updates) => {
    const { swimlanes } = get();
    set({
      swimlanes: swimlanes.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    });
  },
  deleteSwimlane: (id) => {
    const { swimlanes, nodes, deleteNode } = get();
    // 删除泳道中的所有节点
    nodes.filter((n) => n.swimlaneId === id).forEach((n) => deleteNode(n.id));
    set({ swimlanes: swimlanes.filter((s) => s.id !== id) });
  },
  reorderSwimlanes: (swimlanes) => set({ swimlanes }),

  // 节点
  nodes: [],
  selectedNodeIds: [],
  addNode: (node) => {
    const id = uuidv4();
    const newNode: PlanNode = { ...node, id };
    const { nodes, pushHistory } = get();
    pushHistory();
    set({ nodes: [...nodes, newNode] });
    return id;
  },
  updateNode: (id, updates) => {
    const { nodes, pushHistory } = get();
    pushHistory();
    set({
      nodes: nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    });
  },
  deleteNode: (id) => {
    const { nodes, connections, constraints, pushHistory } = get();
    pushHistory();
    set({
      nodes: nodes.filter((n) => n.id !== id),
      connections: connections.filter(
        (c) => c.sourceNodeId !== id && c.targetNodeId !== id
      ),
      constraints: constraints.filter(
        (c) => c.sourceNodeId !== id && c.targetNodeId !== id
      ),
      selectedNodeIds: get().selectedNodeIds.filter((nid) => nid !== id),
    });
  },
  selectNode: (id, multi = false) => {
    const { selectedNodeIds } = get();
    if (multi) {
      if (selectedNodeIds.includes(id)) {
        set({ selectedNodeIds: selectedNodeIds.filter((nid) => nid !== id) });
      } else {
        set({ selectedNodeIds: [...selectedNodeIds, id] });
      }
    } else {
      set({ selectedNodeIds: [id] });
    }
  },
  clearSelection: () => set({ selectedNodeIds: [] }),

  // 连接线
  connections: [],
  selectedConnectionIds: [],  // 问题14：选中的连接线IDs（支持多选）
  connectionStyle: 'simple',  // 问题10：当前连接线样式
  addConnection: (sourceId, targetId, style = 'solid', isCriticalPath = false) => {
    const { connections, pushHistory, connectionStyle } = get();
    // 检查是否已存在相同的连接
    const exists = connections.some(
      (c) =>
        (c.sourceNodeId === sourceId && c.targetNodeId === targetId) ||
        (c.sourceNodeId === targetId && c.targetNodeId === sourceId)
    );
    if (exists || sourceId === targetId) return null;

    const id = uuidv4();
    pushHistory();
    // 问题10：根据当前connectionStyle决定是否为关键路径
    const isCP = isCriticalPath || connectionStyle === 'critical';
    set({
      connections: [...connections, { id, sourceNodeId: sourceId, targetNodeId: targetId, style, isCriticalPath: isCP }],
    });
    return id;
  },
  // 更新连接线
  updateConnection: (id, updates) => {
    const { connections, pushHistory } = get();
    // 如果更新源或目标节点，检查是否会创建重复连接
    if (updates.sourceNodeId || updates.targetNodeId) {
      const conn = connections.find(c => c.id === id);
      if (!conn) return;
      const newSourceId = updates.sourceNodeId || conn.sourceNodeId;
      const newTargetId = updates.targetNodeId || conn.targetNodeId;
      // 检查是否已存在相同的连接（排除当前连接）
      const exists = connections.some(
        (c) =>
          c.id !== id &&
          ((c.sourceNodeId === newSourceId && c.targetNodeId === newTargetId) ||
           (c.sourceNodeId === newTargetId && c.targetNodeId === newSourceId))
      );
      if (exists || newSourceId === newTargetId) return;
    }
    pushHistory();
    set({
      connections: connections.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    });
  },
  // 更新连接线路径配置
  updateConnectionPath: (id, pathConfig) => {
    const { connections, pushHistory } = get();
    pushHistory();
    set({
      connections: connections.map((c) =>
        c.id === id ? { ...c, pathConfig } : c
      ),
    });
  },
  // 更新连接线标签偏移
  updateConnectionLabelOffset: (id, offset) => {
    const { connections } = get();
    set({
      connections: connections.map((c) =>
        c.id === id ? { ...c, labelOffset: offset } : c
      ),
    });
  },
  deleteConnection: (id) => {
    const { connections, pushHistory, selectedConnectionIds } = get();
    pushHistory();
    set({
      connections: connections.filter((c) => c.id !== id),
      selectedConnectionIds: selectedConnectionIds.filter(cid => cid !== id),
    });
  },
  // 问题14：批量删除选中的连接线
  deleteSelectedConnections: () => {
    const { connections, pushHistory, selectedConnectionIds } = get();
    if (selectedConnectionIds.length === 0) return;
    pushHistory();
    set({
      connections: connections.filter((c) => !selectedConnectionIds.includes(c.id)),
      selectedConnectionIds: [],
    });
  },
  // 问题14：选中连接线，支持多选
  selectConnection: (id, multi = false) => {
    const { selectedConnectionIds } = get();
    if (id === null) {
      set({ selectedConnectionIds: [] });
    } else if (multi) {
      if (selectedConnectionIds.includes(id)) {
        set({ selectedConnectionIds: selectedConnectionIds.filter(cid => cid !== id) });
      } else {
        set({ selectedConnectionIds: [...selectedConnectionIds, id] });
      }
    } else {
      set({ selectedConnectionIds: [id] });
    }
  },
  // 问题10：设置连接线样式
  setConnectionStyle: (style) => {
    set({ connectionStyle: style });
  },
  // 切换关键路径
  toggleConnectionCriticalPath: (id) => {
    const { connections } = get();
    set({
      connections: connections.map(c =>
        c.id === id ? { ...c, isCriticalPath: !c.isCriticalPath } : c
      ),
    });
  },

  // 时间约束
  constraints: [],
  selectedConstraintId: null,  // 问题11：选中的约束ID
  addConstraint: (sourceId, targetId, offsetMonths) => {
    const { constraints, pushHistory } = get();
    // 检查是否已存在相同节点对的约束
    const exists = constraints.some(
      (c) =>
        (c.sourceNodeId === sourceId && c.targetNodeId === targetId) ||
        (c.sourceNodeId === targetId && c.targetNodeId === sourceId)
    );
    if (exists || sourceId === targetId) return null;

    // 需求7：检测循环约束
    // 检查添加此约束后是否会形成循环
    const wouldCreateCycle = (source: string, target: string): boolean => {
      // 使用DFS检测从target出发是否能回到source
      const visited = new Set<string>();
      const stack = [target];

      while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === source) return true; // 形成循环
        if (visited.has(current)) continue;
        visited.add(current);

        // 找出所有以current为源的约束
        for (const c of constraints) {
          if (c.sourceNodeId === current) {
            stack.push(c.targetNodeId);
          }
        }
      }
      return false;
    };

    if (wouldCreateCycle(sourceId, targetId)) {
      console.warn('检测到循环约束，已阻止创建');
      return null;
    }

    const id = uuidv4();
    pushHistory();
    set({
      constraints: [
        ...constraints,
        { id, sourceNodeId: sourceId, targetNodeId: targetId, offsetMonths, isLocked: false },
      ],
    });
    return id;
  },
  updateConstraint: (id, updates) => {
    const { constraints } = get();
    set({
      constraints: constraints.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    });
  },
  // 更新约束线标签偏移
  updateConstraintLabelOffset: (id, offset) => {
    const { constraints } = get();
    set({
      constraints: constraints.map((c) =>
        c.id === id ? { ...c, labelOffset: offset } : c
      ),
    });
  },
  deleteConstraint: (id) => {
    const { constraints, pushHistory, selectedConstraintId } = get();
    pushHistory();
    set({
      constraints: constraints.filter((c) => c.id !== id),
      selectedConstraintId: selectedConstraintId === id ? null : selectedConstraintId,
    });
  },
  // 问题11：选中约束
  selectConstraint: (id) => {
    set({ selectedConstraintId: id });
  },
  applyConstraints: (movedNodeId) => {
    const { nodes, constraints, settings } = get();
    const movedNode = nodes.find((n) => n.id === movedNodeId);
    if (!movedNode) return;

    const updatedNodes = [...nodes];
    const processedIds = new Set<string>([movedNodeId]);
    const queue = [movedNodeId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentNode = updatedNodes.find((n) => n.id === currentId);
      if (!currentNode) continue;

      // 查找以当前节点为源的约束
      const relatedConstraints = constraints.filter(
        (c) => c.sourceNodeId === currentId && !processedIds.has(c.targetNodeId)
      );

      for (const constraint of relatedConstraints) {
        const targetNode = updatedNodes.find((n) => n.id === constraint.targetNodeId);
        if (!targetNode) continue;

        // 计算新日期
        const newDate = addMonths(currentNode.date, constraint.offsetMonths);
        // 计算新的x坐标
        const monthsDiff =
          (newDate.getFullYear() - get().startDate.getFullYear()) * 12 +
          (newDate.getMonth() - get().startDate.getMonth());
        const newX = monthsDiff * settings.monthWidth + settings.monthWidth / 2;

        // 更新目标节点
        const targetIndex = updatedNodes.findIndex((n) => n.id === constraint.targetNodeId);
        if (targetIndex !== -1) {
          updatedNodes[targetIndex] = {
            ...updatedNodes[targetIndex],
            date: newDate,
            x: newX,
          };
        }

        processedIds.add(constraint.targetNodeId);
        queue.push(constraint.targetNodeId);
      }
    }

    set({ nodes: updatedNodes });
  },

  // 画布设置
  settings: defaultSettings,
  updateSettings: (updates) => {
    const { settings } = get();
    set({ settings: { ...settings, ...updates } });
  },

  // 当前工具
  currentTool: 'select',
  setCurrentTool: (tool) => set({ currentTool: tool }),

  // 当前 Emoji
  currentEmoji: '😀',
  setCurrentEmoji: (emoji) => set({ currentEmoji: emoji }),

  // 泳道冻结
  frozenSwimlaneCount: 0,
  setFrozenSwimlaneCount: (count) => set({ frozenSwimlaneCount: count }),

  // 连线模式
  connectionStart: null,
  setConnectionStart: (nodeId) => set({ connectionStart: nodeId }),

  // 撤销/重做
  history: [],
  historyIndex: -1,
  pushHistory: () => {
    const { nodes, connections, constraints, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      connections: JSON.parse(JSON.stringify(connections)),
      constraints: JSON.parse(JSON.stringify(constraints)),
    });
    // 限制历史记录数量
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      set({
        nodes: prevState.nodes.map((n) => ({ ...n, date: new Date(n.date) })),
        connections: prevState.connections,
        constraints: prevState.constraints,
        historyIndex: historyIndex - 1,
      });
    }
  },
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      set({
        nodes: nextState.nodes.map((n) => ({ ...n, date: new Date(n.date) })),
        connections: nextState.connections,
        constraints: nextState.constraints,
        historyIndex: historyIndex + 1,
      });
    }
  },

  // 重置
  resetProject: () => {
    set({
      projectName: 'XX项目',
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      endDate: addMonths(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 18),
      swimlanes: createDefaultSwimlanes(),
      nodes: [],
      connections: [],
      constraints: [],
      selectedNodeIds: [],
      selectedConnectionIds: [],
      selectedConstraintId: null,
      connectionStyle: 'simple',
      frozenSwimlaneCount: 0,
      settings: defaultSettings,
      currentTool: 'select',
      currentEmoji: '😀',
      connectionStart: null,
      history: [],
      historyIndex: -1,
    });
  },
}));
