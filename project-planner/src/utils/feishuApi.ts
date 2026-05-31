/**
 * 飞书多维表格 API 封装
 *
 * 通过 Netlify Function 代理飞书 API，避免 CORS
 * 所有请求携带 user_access_token
 */
import { getValidAccessToken } from './feishuAuth';
import type { ProjectData } from '../types';

const APP_TOKEN = import.meta.env.VITE_FEISHU_BITABLE_APP_TOKEN;
const TABLE_ID = import.meta.env.VITE_FEISHU_BITABLE_TABLE_ID;

// 飞书多维表格中的一条记录
export interface BitableRecord {
  record_id: string;
  fields: {
    projectId: string;
    name: string;
    owner: string;
    ownerName: string;
    startDate: number;     // 飞书日期字段用毫秒时间戳
    endDate: number;
    updatedAt: number;
    updatedBy: string;
    data: string;          // 完整项目 JSON
    [key: string]: unknown;
  };
}

// 项目元数据（列表展示用，不含完整 data）
export interface ProjectMeta {
  recordId: string;         // 飞书记录 ID
  projectId: string;
  name: string;
  owner: string;
  ownerName: string;
  startDate: Date;
  endDate: Date;
  updatedAt: Date;
  updatedBy: string;
  nodeCount?: number;       // 从 data 中提取
  swimlaneCount?: number;
}

// ========= 底层请求 =========

/**
 * 获取 Netlify Function 的基础 URL
 */
function getApiBaseUrl(): string {
  return '/.netlify/functions';
}

/**
 * 通过 Netlify Function 代理发送飞书 API 请求
 */
async function feishuRequest(path: string, method: string = 'GET', body?: unknown): Promise<any> {
  const token = await getValidAccessToken();
  if (!token) {
    throw new Error('未登录或 token 已过期');
  }

  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/feishu-api`, {
    method: 'POST', // Netlify Function 统一用 POST
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Feishu-Path': path,
      'X-Feishu-Method': method,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (data.code !== 0) {
    console.error('飞书 API 错误:', data);
    throw new Error(data.msg || `飞书 API 错误 (code: ${data.code})`);
  }

  return data.data;
}

// ========= 项目 CRUD =========

/**
 * 获取项目列表（只取元数据，不取完整 data 字段以节省流量）
 */
export async function listProjects(): Promise<ProjectMeta[]> {
  const path = `/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records?page_size=100`;
  const result = await feishuRequest(path, 'GET');

  if (!result?.items?.length) return [];

  return result.items.map((item: BitableRecord) => {
    const f = item.fields;
    // 尝试从 data 字段中提取节点数（如果数据量不大）
    let nodeCount = 0;
    let swimlaneCount = 0;
    if (f.data) {
      try {
        const parsed = JSON.parse(f.data);
        nodeCount = parsed.nodes?.length || 0;
        swimlaneCount = parsed.swimlanes?.length || 0;
      } catch { /* 忽略解析错误 */ }
    }

    return {
      recordId: item.record_id,
      projectId: f.projectId,
      name: f.name,
      owner: f.owner,
      ownerName: f.ownerName,
      startDate: new Date(f.startDate),
      endDate: new Date(f.endDate),
      updatedAt: new Date(f.updatedAt),
      updatedBy: f.updatedBy,
      nodeCount,
      swimlaneCount,
    };
  });
}

/**
 * 获取单个项目的完整数据
 */
export async function getProject(recordId: string): Promise<{ meta: ProjectMeta; projectData: ProjectData } | null> {
  const path = `/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/${recordId}`;
  const result = await feishuRequest(path, 'GET');

  if (!result?.record) return null;

  const f = result.record.fields;
  const meta: ProjectMeta = {
    recordId: result.record.record_id,
    projectId: f.projectId,
    name: f.name,
    owner: f.owner,
    ownerName: f.ownerName,
    startDate: new Date(f.startDate),
    endDate: new Date(f.endDate),
    updatedAt: new Date(f.updatedAt),
    updatedBy: f.updatedBy,
  };

  // 解析完整项目数据
  let projectData: ProjectData;
  try {
    const parsed = JSON.parse(f.data);
    projectData = deserializeProjectData(parsed);
  } catch {
    throw new Error('项目数据解析失败');
  }

  return { meta, projectData };
}

/**
 * 创建新项目
 */
export async function createProject(
  project: ProjectData,
  ownerOpenId: string,
  ownerName: string
): Promise<string> {
  const path = `/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records`;

  const fields = {
    projectId: project.id,
    name: project.name,
    owner: ownerOpenId,
    ownerName: ownerName,
    startDate: project.startDate.getTime(),
    endDate: project.endDate.getTime(),
    updatedAt: Date.now(),
    updatedBy: ownerOpenId,
    data: JSON.stringify(serializeProjectData(project)),
  };

  const result = await feishuRequest(path, 'POST', { fields });
  return result.record.record_id;
}

/**
 * 更新项目（带乐观锁检查）
 */
export async function updateProject(
  recordId: string,
  project: ProjectData,
  updaterOpenId: string,
  expectedUpdatedAt?: Date
): Promise<{ success: boolean; conflict?: boolean; latestUpdatedAt?: Date }> {
  // 乐观锁：先检查 updatedAt 是否一致
  if (expectedUpdatedAt) {
    const current = await getProjectUpdatedAt(recordId);
    if (current && Math.abs(current.getTime() - expectedUpdatedAt.getTime()) > 1000) {
      return { success: false, conflict: true, latestUpdatedAt: current };
    }
  }

  const path = `/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/${recordId}`;

  const fields = {
    name: project.name,
    startDate: project.startDate.getTime(),
    endDate: project.endDate.getTime(),
    updatedAt: Date.now(),
    updatedBy: updaterOpenId,
    data: JSON.stringify(serializeProjectData(project)),
  };

  await feishuRequest(path, 'PUT', { fields });
  return { success: true };
}

/**
 * 删除项目
 */
export async function deleteProject(recordId: string): Promise<void> {
  const path = `/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/${recordId}`;
  await feishuRequest(path, 'DELETE');
}

/**
 * 获取项目的 updatedAt（轮询用，只读一个字段）
 */
export async function getProjectUpdatedAt(recordId: string): Promise<Date | null> {
  try {
    const path = `/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/${recordId}`;
    const result = await feishuRequest(path, 'GET');
    if (result?.record?.fields?.updatedAt) {
      return new Date(result.record.fields.updatedAt);
    }
    return null;
  } catch {
    return null;
  }
}

// ========= 数据序列化/反序列化 =========

/**
 * 序列化 ProjectData（Date → ISO 字符串）
 */
function serializeProjectData(project: ProjectData): any {
  return {
    ...project,
    startDate: project.startDate.toISOString(),
    endDate: project.endDate.toISOString(),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    nodes: project.nodes.map((n) => ({
      ...n,
      date: n.date instanceof Date ? n.date.toISOString() : n.date,
      endDate: n.endDate instanceof Date ? n.endDate.toISOString() : n.endDate,
    })),
  };
}

/**
 * 反序列化 ProjectData（ISO 字符串 → Date）
 */
function deserializeProjectData(data: any): ProjectData {
  return {
    ...data,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    nodes: data.nodes.map((n: any) => ({
      ...n,
      date: new Date(n.date),
      endDate: n.endDate ? new Date(n.endDate) : undefined,
    })),
  };
}
