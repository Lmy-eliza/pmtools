import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ProjectVersion } from '../../types';

interface VersionHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | undefined;
  onSaveVersion: (name?: string) => Promise<void>;
  onRestoreVersion: (version: ProjectVersion) => void;
  loadVersions: (projectId: string) => Promise<ProjectVersion[]>;
  deleteVersion: (versionId: string) => Promise<void>;
}

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  isOpen,
  onClose,
  projectId,
  onSaveVersion,
  onRestoreVersion,
  loadVersions,
  deleteVersion,
}) => {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  useEffect(() => {
    if (isOpen && projectId) {
      setLoading(true);
      loadVersions(projectId)
        .then(setVersions)
        .finally(() => setLoading(false));
    }
  }, [isOpen, projectId, loadVersions]);

  const handleSaveVersion = async () => {
    setSavingVersion(true);
    try {
      await onSaveVersion(versionName || undefined);
      if (projectId) {
        const updated = await loadVersions(projectId);
        setVersions(updated);
      }
      setVersionName('');
      setShowSaveForm(false);
    } finally {
      setSavingVersion(false);
    }
  };

  const handleDelete = async (versionId: string) => {
    if (confirm('确定删除此版本吗？')) {
      await deleteVersion(versionId);
      setVersions(versions.filter(v => v.id !== versionId));
    }
  };

  const handleRestore = (version: ProjectVersion) => {
    if (confirm(`确定恢复到版本 "${version.name}" 吗？当前未保存的更改将丢失。`)) {
      onRestoreVersion(version);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[500px] max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock size={18} />
            版本历史
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSaveForm(!showSaveForm)}
              className="btn btn-primary text-sm flex items-center gap-1"
              disabled={!projectId}
            >
              <Save size={14} />
              保存版本
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 保存版本表单 */}
        {showSaveForm && (
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex gap-2">
              <input
                type="text"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="版本名称（可选）"
                className="input flex-1"
              />
              <button
                onClick={handleSaveVersion}
                disabled={savingVersion}
                className="btn btn-primary"
              >
                {savingVersion ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => { setShowSaveForm(false); setVersionName(''); }}
                className="btn"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 版本列表 */}
        <div className="flex-1 overflow-auto p-4">
          {!projectId ? (
            <div className="text-gray-400 text-center py-8">
              请先保存项目后再使用版本管理功能
            </div>
          ) : loading ? (
            <div className="text-gray-400 text-center py-8">加载中...</div>
          ) : versions.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              暂无历史版本
              <br />
              <span className="text-sm">点击"保存版本"创建第一个版本</span>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map(version => (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100"
                >
                  <div className="flex-1">
                    <div className="font-medium">{version.name}</div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(version.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                    </div>
                    {version.description && (
                      <div className="text-sm text-gray-600 mt-1">{version.description}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRestore(version)}
                      className="btn text-sm flex items-center gap-1"
                      title="恢复此版本"
                    >
                      <RotateCcw size={14} />
                      恢复
                    </button>
                    <button
                      onClick={() => handleDelete(version.id)}
                      className="text-red-400 hover:text-red-500 p-1"
                      title="删除此版本"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryPanel;
