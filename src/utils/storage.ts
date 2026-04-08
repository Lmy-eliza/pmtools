import Dexie, { type Table } from 'dexie';
import type { ProjectData, ProjectVersion } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
  return JSON.stringify(project, null, 2);
}

export function importFromJSON(json: string): ProjectData {
  const data = JSON.parse(json);
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
