import { v4 as uuidv4 } from 'uuid';
import { DEMO_PROJECT_JSON, DEMO_REPLY } from './demoData';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  projectData?: string;
}

export interface ChatResponse {
  reply: string;
  projectData?: string;
}

// 历史消息裁剪：只保留最近 MAX_HISTORY 轮，大 JSON 替换为摘要
const MAX_HISTORY = 10;

function trimHistory(messages: ChatMessage[]): { role: string; content: string }[] {
  const recent = messages.slice(-MAX_HISTORY * 2);
  return recent.map(m => ({
    role: m.role,
    content: m.projectData
      ? '[已生成 ProjectData JSON，前端已接收]'
      : m.content,
  }));
}

// ─── Mock 模式（Phase 1） ───

const MOCK_PROJECT_JSON = JSON.stringify({
  id: uuidv4(),
  name: 'AI 生成的示例计划',
  schemaVersion: '1.0',
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  swimlanes: [
    { id: 'sw-1', name: '软件开发', order: 0, isCollapsed: false },
    { id: 'sw-2', name: '硬件开发', order: 1, isCollapsed: false },
    { id: 'sw-3', name: '测试验证', order: 2, isCollapsed: false },
  ],
  nodes: [
    {
      id: 'n-1', type: 'diamond', name: 'G10 项目启动',
      color: '#007aff', x: 100, y: 60,
      date: new Date().toISOString(),
      swimlaneId: 'sw-1',
    },
    {
      id: 'n-2', type: 'rectangle', name: '需求分析与架构设计',
      color: '#34c759', x: 200, y: 60,
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
      swimlaneId: 'sw-1', width: 180,
    },
    {
      id: 'n-3', type: 'rectangle', name: '硬件选型与验证',
      color: '#ff9500', x: 200, y: 180,
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString(),
      swimlaneId: 'sw-2', width: 240,
    },
    {
      id: 'n-4', type: 'rectangle', name: '集成测试',
      color: '#af52de', x: 400, y: 300,
      date: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 210 * 24 * 60 * 60 * 1000).toISOString(),
      swimlaneId: 'sw-3', width: 120,
    },
    {
      id: 'n-5', type: 'diamond', name: 'G0 SOP',
      color: '#ff3b30', x: 600, y: 60,
      date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      swimlaneId: 'sw-1',
    },
  ],
  connections: [
    { sourceNodeId: 'n-1', targetNodeId: 'n-2', style: 'solid', color: '#666', isCriticalPath: false },
    { sourceNodeId: 'n-1', targetNodeId: 'n-3', style: 'solid', color: '#666', isCriticalPath: false },
    { sourceNodeId: 'n-2', targetNodeId: 'n-4', style: 'dashed', color: '#666', isCriticalPath: false },
    { sourceNodeId: 'n-3', targetNodeId: 'n-4', style: 'dashed', color: '#666', isCriticalPath: false },
    { sourceNodeId: 'n-4', targetNodeId: 'n-5', style: 'solid', color: '#ff3b30', isCriticalPath: true },
  ],
  constraints: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}, null, 2);

function mockEditProject(message: string, currentProjectData?: string): ChatResponse {
  if (!currentProjectData) {
    return { reply: '当前还没有计划，请先生成一个。需要我帮你创建吗？' };
  }

  try {
    const project = JSON.parse(currentProjectData);
    const delayMatch = message.match(/(?:延后|推迟|移动).*?(\d+)\s*天/);
    const advanceMatch = message.match(/(?:提前|加快).*?(\d+)\s*天/);
    const targetMatch = message.match(/(G\d+|GTC)/i);

    if ((delayMatch || advanceMatch) && targetMatch) {
      const days = parseInt(delayMatch?.[1] || advanceMatch?.[1] || '0');
      const direction = delayMatch ? 1 : -1;
      const targetName = targetMatch[1].toUpperCase();
      const node = project.nodes.find((n: { name: string }) => n.name.includes(targetName));
      if (node) {
        const oldDate = new Date(node.date);
        const newDate = new Date(oldDate.getTime() + direction * days * 86400000);
        node.date = newDate.toISOString();
        node.x = node.x + direction * days * (200 / 30);
        project.updatedAt = new Date().toISOString();
        return {
          reply: `已将 ${targetName} 从 ${oldDate.toISOString().slice(0, 10)} ${delayMatch ? '延后' : '提前'}至 ${newDate.toISOString().slice(0, 10)}（${direction > 0 ? '+' : '-'}${days}天）。\n\n注意：关联节点未自动调整，如需进一步修改请告知。`,
          projectData: JSON.stringify(project, null, 2),
        };
      }
      return { reply: `未找到名为"${targetName}"的节点。当前计划包含：${project.nodes.filter((n: { type: string }) => n.type === 'diamond' || n.type === 'pentagon').map((n: { name: string }) => n.name).join('、')}` };
    }

    return {
      reply: `[Mock] 收到编辑指令："${message}"。实际编辑能力需接入 AI API 后生效。\n\n当前支持的 mock 编辑：\n- "把 G0 延后 15 天"\n- "把 G10 提前 30 天"`,
    };
  } catch {
    return { reply: '解析当前计划失败，请重新导入后再试。' };
  }
}

function mockQueryProject(message: string, currentProjectData?: string): ChatResponse {
  if (!currentProjectData) {
    return { reply: '当前没有已加载的计划，无法查询。请先生成或导入一个计划。' };
  }

  try {
    const project = JSON.parse(currentProjectData);
    const nodeCount = project.nodes?.length || 0;
    const swimlaneCount = project.swimlanes?.length || 0;
    const gateNodes = project.nodes?.filter((n: { type: string }) => n.type === 'pentagon' || n.type === 'diamond') || [];

    if (/多少天|间隔/.test(message)) {
      const gateMatch = message.match(/(G\d+|GTC).*?(G\d+|GTC)/i);
      if (gateMatch) {
        const g1 = project.nodes.find((n: { name: string }) => n.name.includes(gateMatch[1].toUpperCase()));
        const g2 = project.nodes.find((n: { name: string }) => n.name.includes(gateMatch[2].toUpperCase()));
        if (g1 && g2) {
          const diff = Math.abs(new Date(g2.date).getTime() - new Date(g1.date).getTime());
          const days = Math.round(diff / 86400000);
          return { reply: `${gateMatch[1].toUpperCase()}（${new Date(g1.date).toISOString().slice(0, 10)}）到 ${gateMatch[2].toUpperCase()}（${new Date(g2.date).toISOString().slice(0, 10)}）之间间隔 **${days} 天**（约 ${Math.round(days / 30)} 个月）。` };
        }
      }
    }

    return {
      reply: `当前计划「${project.name}」概况：\n- 节点总数：${nodeCount}（阀点/里程碑 ${gateNodes.length} + 活动 ${nodeCount - gateNodes.length}）\n- 甬道数：${swimlaneCount}\n- 周期：${project.startDate?.slice(0, 10)} → ${project.endDate?.slice(0, 10)}`,
    };
  } catch {
    return { reply: '解析当前计划失败，请重新导入后再试。' };
  }
}

async function mockSendMessage(message: string, _history: ChatMessage[], currentProjectData?: string): Promise<ChatResponse> {
  await new Promise(r => setTimeout(r, 800 + Math.random() * 700));

  const isGenerateRequest = /生成|创建|排计划|倒排|规划|新建/.test(message);
  const isEditRequest = /延后|提前|调整|删除|移除|添加|推迟|移动|新增|去掉|改名|重命名/.test(message);
  const isQueryRequest = /多少天|几个|什么时候|统计|列出|关键路径|概况|间隔/.test(message);

  if (isGenerateRequest) {
    return {
      reply: `好的，我已根据你的需求生成了一个示例项目计划，包含 3 个泳道、5 个节点和 5 条连接线。\n\n点击下方「导入计划」按钮即可将计划加载到画布中。`,
      projectData: MOCK_PROJECT_JSON,
    };
  }

  if (isEditRequest) {
    return mockEditProject(message, currentProjectData);
  }

  if (isQueryRequest) {
    return mockQueryProject(message, currentProjectData);
  }

  return {
    reply: `收到你的消息："${message}"\n\n我是 Smart Planner 的 AI 助手，支持以下能力：\n\n**生成计划**：\n- "生成一个全新车型计划，SOP 2028-06-01"\n\n**编辑计划**：\n- "把 G5 延后 15 天"\n- "添加一个新的活动节点"\n\n**查询计划**：\n- "G5 到 G4 之间多少天？"\n- "当前计划概况"`,
  };
}

// ─── 真实 API（Phase 2，Key 到手后启用） ───

const DEMO_KEYWORDS = /示例项目.*计划|排.*计划.*中改.*SOP/;

// 五级意图识别（优先级从高到低）
const ROLLBACK_PATTERN = /还原|撤销|回到之前|恢复|取消修改|退回|上一版/;
const EDIT_PATTERN = /延后|提前|调整|删除|移除|添加|增加|推迟|移动|加快|新增|去掉|改名|重命名|换颜色|补充活动|修改/;
const DIAGNOSE_PATTERN = /检查|诊断|分析|有没有问题|合理性|风险/;
const QUERY_PATTERN = /多少天|几个|什么时候|统计|列出|关键路径|概况/;

function buildProjectSummary(projectData: string): string {
  try {
    const project = JSON.parse(projectData);
    const gates = (project.nodes || [])
      .filter((n: { type: string }) => n.type === 'pentagon' || n.type === 'diamond')
      .sort((a: { date: string }, b: { date: string }) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((n: { name: string; date: string }) => `${n.name}(${n.date.slice(0, 10)})`)
      .join(', ');
    const swimlanes: { id: string; name: string }[] = project.swimlanes || [];
    const nodes: { swimlaneId: string; type: string }[] = project.nodes || [];
    const swimlaneActivity = swimlanes
      .map(s => {
        const count = nodes.filter(n => n.swimlaneId === s.id && n.type === 'rectangle').length;
        return `${s.name}(${count})`;
      })
      .join(', ');
    const activityCount = nodes.filter(n => n.type === 'rectangle').length;
    const gateCount = nodes.length - activityCount;

    return `[当前计划摘要]
项目：${project.name}
周期：${project.startDate?.slice(0, 10)} → ${project.endDate?.slice(0, 10)}
阀点：${gates}
泳道活动数：${swimlaneActivity}
节点总数：${nodes.length}（阀点/里程碑 ${gateCount} + 活动 ${activityCount}）
连接线：${(project.connections || []).length}条`;
  } catch {
    return '[当前计划摘要] 解析失败';
  }
}

function prepareDemoData(): string {
  const demo = JSON.parse(DEMO_PROJECT_JSON);

  // 只保留关键路径连线
  demo.connections = demo.connections.filter((c: { isCriticalPath?: boolean }) => c.isCriticalPath);

  // 无状态节点标记为 on_track，保证泳道统计指示器正常显示
  demo.nodes = demo.nodes.map((n: { status?: string }) => {
    if (!n.status) return { ...n, status: 'on_track' };
    return n;
  });

  return JSON.stringify(demo);
}

async function realSendMessage(message: string, history: ChatMessage[], currentProjectData?: string): Promise<ChatResponse> {
  // Demo 快捷路径
  if (DEMO_KEYWORDS.test(message)) {
    await new Promise(r => setTimeout(r, 300));
    return { reply: DEMO_REPLY, projectData: prepareDemoData() };
  }

  // 回退意图：前端直接回复，不走 API
  if (ROLLBACK_PATTERN.test(message) && !EDIT_PATTERN.test(message)) {
    return {
      reply: '你可以使用画布顶部工具栏的撤销按钮（快捷键 Ctrl+Z）回到上一步，最多支持 50 步撤销。',
    };
  }

  // 上下文注入分级：EDIT/DIAGNOSE → 完整JSON，QUERY → 摘要，其他 → 不注入
  let finalMessage = message;
  if (currentProjectData) {
    if (EDIT_PATTERN.test(message)) {
      finalMessage = `[当前计划 JSON]\n\`\`\`json\n${currentProjectData}\n\`\`\`\n[用户请求]\n${message}`;
    } else if (DIAGNOSE_PATTERN.test(message)) {
      finalMessage = `[当前计划 JSON]\n\`\`\`json\n${currentProjectData}\n\`\`\`\n[用户请求]\n${message}`;
    } else if (QUERY_PATTERN.test(message)) {
      finalMessage = `${buildProjectSummary(currentProjectData)}\n[用户请求]\n${message}`;
    }
  }

  const trimmed = trimHistory(history);
  const res = await fetch('/.netlify/functions/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: finalMessage, history: trimmed }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`请求失败 (${res.status})${errText ? ': ' + errText : ''}`);
  }

  const data = await res.json();
  return {
    reply: data.reply,
    projectData: data.projectData,
  };
}

// ─── 导出：根据环境切换 mock / real ───

const USE_MOCK = !import.meta.env.VITE_CHAT_API_REAL;

export async function sendChatMessage(message: string, history: ChatMessage[], currentProjectData?: string): Promise<ChatResponse> {
  return USE_MOCK
    ? mockSendMessage(message, history, currentProjectData)
    : realSendMessage(message, history, currentProjectData);
}
