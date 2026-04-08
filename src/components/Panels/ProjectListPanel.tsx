import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, FileText, Clock, Search } from 'lucide-react';
import { listProjects, deleteProject, loadProject } from '../../utils/storage';
import type { ProjectData } from '../../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ProjectListPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: ProjectData) => void;
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
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const list = await listProjects();
      // 按更新时间倒序
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setProjects(list);
    } catch (error) {
      console.error('加载项目列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个项目吗？此操作不可恢复。')) {
      try {
        await deleteProject(id);
        await loadProjects();
      } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败');
      }
    }
  };

  const handleSelectProject = async (projectId: string) => {
    try {
      const project = await loadProject(projectId);
      if (project) {
        onSelectProject(project);
        onClose();
      }
    } catch (error) {
      console.error('加载项目失败:', error);
      alert('加载项目失败');
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-blue-500" />
            <h2 className="text-lg font-semibold">我的项目</h2>
            <span className="text-sm text-gray-400">({projects.length})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 搜索和新建 */}
        <div className="px-6 py-4 border-b border-gray-100 flex gap-3">
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
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleSelectProject(project.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    project.id === currentProjectId
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800 mb-1">
                        {project.name}
                        {project.id === currentProjectId && (
                          <span className="ml-2 text-xs text-blue-500 font-normal">(当前)</span>
                        )}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {format(new Date(project.updatedAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                        </span>
                        <span>{project.nodes?.length || 0} 个节点</span>
                        <span>{project.swimlanes?.length || 0} 个泳道</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(project.id, e)}
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
          <p className="text-xs text-gray-400">项目数据保存在浏览器本地，清除浏览器数据会丢失</p>
        </div>
      </div>
    </div>
  );
};

export default ProjectListPanel;
