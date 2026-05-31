import Dexie, { type Table } from 'dexie';
import type { ProjectData, ProjectVersion, NodeType } from '../types';
import { v4 as uuidv4 } from 'uuid';

const VALID_NODE_TYPES: NodeType[] = [
  'diamond', 'triangle', 'rectangle', 'star', 'circle', 'hexagon', 'emoji', 'pentagon'
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateProjectJSON(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['输入不是有效的 JSON 对象'] };
  }

  if (!data.name || typeof data.name !== 'string') {
    errors.push('缺少必填字段 "name"（项目名称）');
  }
  if (!Array.isArray(data.nodes)) {
    errors.push('缺少必填字段 "nodes"（节点数组）');
  }
  if (!Array.isArray(data.swimlanes)) {
    errors.push('缺少必填字段 "swimlanes"（泳道数组）');
  }

  if (!Array.isArray(data.nodes) || !Array.isArray(data.swimlanes)) {
    return { valid: false, errors };
  }

  const swimlaneIds = new Set(data.swimlanes.map((s: any) => s.id));

  data.nodes.forEach((node: any, index: number) => {
    const label = node.name || '未命名';
    if (!VALID_NODE_TYPES.includes(node.type)) {
      errors.push(`nodes[${index}]（${label}）类型 "${node.type}" 无效，有效类型：${VALID_NODE_TYPES.join(', ')}`);
    }
    if (node.swimlaneId && !swimlaneIds.has(node.swimlaneId)) {
      errors.push(`nodes[${index}]（${label}）的 swimlaneId "${node.swimlaneId}" 未在 swimlanes 中定义`);
    }
    if (node.date && isNaN(Date.parse(node.date))) {
      errors.push(`nodes[${index}]（${label}）的 date "${node.date}" 不是有效日期`);
    }
    if (node.endDate && isNaN(Date.parse(node.endDate))) {
      errors.push(`nodes[${index}]（${label}）的 endDate "${node.endDate}" 不是有效日期`);
    }
  });

  if (data.startDate && isNaN(Date.parse(data.startDate))) {
    errors.push(`startDate "${data.startDate}" 不是有效日期`);
  }
  if (data.endDate && isNaN(Date.parse(data.endDate))) {
    errors.push(`endDate "${data.endDate}" 不是有效日期`);
  }

  return { valid: errors.length === 0, errors };
}

class ProjectDatabase extends Dexie {
  projects!: Table<ProjectData, string>;
  versions!: Table<ProjectVersion, string>;

  constructor() {
    super('ProjectPlannerDB');
    this.version(2).stores({
      projects: 'id, name, createdAt, updatedAt',
      versions: 'id, projectId, createdAt',
    });
  }
}

const db = new ProjectDatabase();

export async function saveProject(project: ProjectData): Promise<void> {
  await db.projects.put({
    ...project,
    updatedAt: new Date(),
  });
}

export async function loadProject(id: string): Promise<ProjectData | undefined> {
  const project = await db.projects.get(id);
  if (project) {
    // 恢复日期对象
    return {
      ...project,
      startDate: new Date(project.startDate),
      endDate: new Date(project.endDate),
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
      nodes: project.nodes.map((n) => ({
        ...n,
        date: new Date(n.date),
        endDate: n.endDate ? new Date(n.endDate) : undefined,
      })),
    };
  }
  return undefined;
}

export async function listProjects(): Promise<ProjectData[]> {
  const projects = await db.projects.toArray();
  return projects.map((p) => ({
    ...p,
    startDate: new Date(p.startDate),
    endDate: new Date(p.endDate),
    createdAt: new Date(p.createdAt),
    updatedAt: new Date(p.updatedAt),
    nodes: p.nodes.map((n) => ({
      ...n,
      date: new Date(n.date),
      endDate: n.endDate ? new Date(n.endDate) : undefined,
    })),
  }));
}

export async function deleteProject(id: string): Promise<void> {
  await db.projects.delete(id);
}

export function exportToJSON(project: ProjectData): string {
  const exportData = {
    ...project,
    schemaVersion: '1.0',
  };
  return JSON.stringify(exportData, null, 2);
}

export function importFromJSON(json: string): ProjectData {
  const data = JSON.parse(json);

  const validation = validateProjectJSON(data);
  if (!validation.valid) {
    throw new Error(`JSON 格式验证失败：\n${validation.errors.join('\n')}`);
  }

  // 归一化：非阀点节点的 pentagon → diamond（兼容旧 JSON）
  const GATE_NAME_PATTERN = /^G\d+$|^GTC$|^EOP$/;
  data.nodes.forEach((n: any) => {
    if (n.type === 'pentagon' && !GATE_NAME_PATTERN.test(n.name)) {
      n.type = 'diamond';
    }
  });

  return {
    ...data,
    schemaVersion: data.schemaVersion || undefined,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    createdAt: new Date(data.createdAt || new Date()),
    updatedAt: new Date(data.updatedAt || new Date()),
    nodes: data.nodes.map((n: any) => ({
      ...n,
      date: new Date(n.date),
      endDate: n.endDate ? new Date(n.endDate) : undefined,
    })),
    connections: data.connections || [],
    constraints: data.constraints || [],
  };
}

// 版本管理功能
export async function saveVersion(
  projectId: string,
  data: ProjectData,
  name?: string
): Promise<string> {
  const id = uuidv4();
  const versions = await listVersions(projectId);
  const versionName = name || `v${versions.length + 1}`;

  await db.versions.put({
    id,
    projectId,
    name: versionName,
    data: JSON.parse(JSON.stringify(data)), // 深拷贝
    createdAt: new Date(),
  });
  return id;
}

export async function listVersions(projectId: string): Promise<ProjectVersion[]> {
  const versions = await db.versions
    .where('projectId')
    .equals(projectId)
    .reverse()
    .sortBy('createdAt');

  return versions.map(v => ({
    ...v,
    createdAt: new Date(v.createdAt),
    data: {
      ...v.data,
      startDate: new Date(v.data.startDate),
      endDate: new Date(v.data.endDate),
      createdAt: new Date(v.data.createdAt),
      updatedAt: new Date(v.data.updatedAt),
      nodes: v.data.nodes.map((n: any) => ({
        ...n,
        date: new Date(n.date),
        endDate: n.endDate ? new Date(n.endDate) : undefined,
      })),
    },
  }));
}

export async function loadVersion(versionId: string): Promise<ProjectVersion | undefined> {
  const version = await db.versions.get(versionId);
  if (version) {
    return {
      ...version,
      createdAt: new Date(version.createdAt),
      data: {
        ...version.data,
        startDate: new Date(version.data.startDate),
        endDate: new Date(version.data.endDate),
        createdAt: new Date(version.data.createdAt),
        updatedAt: new Date(version.data.updatedAt),
        nodes: version.data.nodes.map((n: any) => ({
          ...n,
          date: new Date(n.date),
          endDate: n.endDate ? new Date(n.endDate) : undefined,
        })),
      },
    };
  }
  return undefined;
}

export async function deleteVersion(versionId: string): Promise<void> {
  await db.versions.delete(versionId);
}
