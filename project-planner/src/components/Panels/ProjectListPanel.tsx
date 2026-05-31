/**
 * 项目列表面板
 *
 * 双模式：
 * - 未登录：显示本地 IndexedDB 项目（原有逻辑）
 * - 已登录：显示飞书多维表格中的云端项目 + 本地项目
 */
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, FileText, Clock, Search, Cloud, HardDrive, User } from 'lucide-react';
import { listProjects as listLocalProjects, deleteProject as deleteLocalProject, loadProject as loadLocalProject } from '../../utils/storage';
import { listProjects as listCloudProjects, getProject as getCloudProject, deleteProject as deleteCloudProject, type ProjectMeta } from '../../utils/feishuApi';
import { useAuthStore } from '../../stores/authStore';
import type { ProjectData } from '../../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 统一的项目列表项（兼容本地和云端）
interface ProjectListItem {
  id: string;           // 本地项目用 projectId，云端项目用 recordId
  projectId: string;
  name: string;
  updatedAt: Date;
  nodeCount: number;
  swimlaneCount: number;
  source: 'local' | 'cloud';
  ownerName?: string;
  recordId?: string;    // 云端项目的飞书记录 ID
}

interface ProjectListPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: ProjectData, recordId?: string) => void;
  onNewProject: () => void;
  currentProjectId?: string;
}

export const ProjectListPanel: React.FC<ProjectListPanelProps> = ({
  isOpen,
  onClose,
  onSelectProject,
  onNewProject,
  currentProjectId,
}) => {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'local' | 'cloud'>('all');
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      loadAllProjects();
    }
  }, [isOpen, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAllProjects = async () => {
    setLoading(true);
    try {
      const items: ProjectListItem[] = [];

      // 加载本地项目
      const localList = await listLocalProjects();
      localList.forEach((p) => {
        items.push({
          id: p.id,
          projectId: p.id,
          name: p.name,
          updatedAt: new Date(p.updatedAt),
          nodeCount: p.nodes?.length || 0,
          swimlaneCount: p.swimlanes?.length || 0,
          source: 'local',
        });
      });

      // 如果已登录，加载云端项目
      if (isAuthenticated) {
        try {
          const cloudList = await listCloudProjects();
          cloudList.forEach((p: ProjectMeta) => {
            items.push({
              id: p.recordId,
              projectId: p.projectId,
              name: p.name,
              updatedAt: new Date(p.updatedAt),
              nodeCount: p.nodeCount || 0,
              swimlaneCount: p.swimlaneCount || 0,
              source: 'cloud',
              ownerName: p.ownerName,
              recordId: p.recordId,
            });
          });
        } catch (error) {
          console.error('加载云端项目失败:', error);
        }
      }

      // 按更新时间倒序
      items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      setProjects(items);
    } catch (error) {
      console.error('加载项目列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: ProjectListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个项目吗？此操作不可恢复。')) {
      try {
        if (item.source === 'local') {
          await deleteLocalProject(item.id);
        } else if (item.recordId) {
          await deleteCloudProject(item.recordId);
        }
        await loadAllProjects();
      } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败');
      }
    }
  };

  const handleSelectProject = async (item: ProjectListItem) => {
    try {
      if (item.source === 'local') {
        const project = await loadLocalProject(item.id);
        if (project) {
          onSelectProject(project);
          onClose();
        }
      } else if (item.recordId) {
        // 云端项目：从飞书获取完整数据
        const result = await getCloudProject(item.recordId);
        if (result) {
          onSelectProject(result.projectData, item.recordId);
          onClose();
        }
      }
    } catch (error) {
      console.error('加载项目失败:', error);
      alert('加载项目失败');
    }
  };

  // 过滤逻辑
  const filteredProjects = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTab = activeTab === 'all' || p.source === activeTab;
    return matchSearch && matchTab;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-blue-500" />
            <h2 className="text-lg font-semibold">我的项目</h2>
            <span className="text-sm text-gray-400">({filteredProjects.length})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 搜索和新建 + Tab 切换 */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex gap-3 mb-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索项目..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <button
              onClick={() => {
                onNewProject();
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              <Plus size={16} />
              新建项目
            </button>
          </div>

          {/* Tab 切换：仅在登录态下显示 */}
          {isAuthenticated && (
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {[
                { key: 'all' as const, label: '全部', icon: null },
                { key: 'local' as const, label: '本地', icon: <HardDrive size={12} /> },
                { key: 'cloud' as const, label: '云端', icon: <Cloud size={12} /> },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-md transition-colors ${
                    activeTab === tab.key
                      ? 'bg-white text-blue-600 shadow-sm font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 项目列表 */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-400">
              加载中...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <FileText size={40} className="mb-2 opacity-50" />
              <p>{searchQuery ? '没有找到匹配的项目' : '暂无保存的项目'}</p>
              <button
                onClick={() => {
                  onNewProject();
                  onClose();
                }}
                className="mt-4 text-blue-500 hover:text-blue-600 text-sm"
              >
                创建第一个项目
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProjects.map((item) => (
                <div
                  key={`${item.source}-${item.id}`}
                  onClick={() => handleSelectProject(item)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    item.projectId === currentProjectId
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-800">
                          {item.name}
                          {item.projectId === currentProjectId && (
                            <span className="ml-2 text-xs text-blue-500 font-normal">(当前)</span>
                          )}
                        </h3>
                        {/* 来源标记 */}
                        {item.source === 'cloud' ? (
                          <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                            <Cloud size={10} />
                            云端
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                            <HardDrive size={10} />
                            本地
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {format(item.updatedAt, 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                        </span>
                        <span>{item.nodeCount} 个节点</span>
                        <span>{item.swimlaneCount} 个泳道</span>
                        {item.ownerName && (
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {item.ownerName}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(item, e)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除项目"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 text-center">
          <p className="text-xs text-gray-400">
            {isAuthenticated
              ? '本地项目保存在浏览器，云端项目保存在飞书多维表格'
              : '项目数据保存在浏览器本地，登录飞书可同步至云端'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProjectListPanel;
