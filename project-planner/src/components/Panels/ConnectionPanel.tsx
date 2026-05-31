import React, { useState } from 'react';
import { useCanvasStore } from '../../stores/canvasStore';
import { X, Trash2, ChevronDown, ChevronRight, ArrowRight, Route, Edit2, Check } from 'lucide-react';

interface ConnectionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    nodes,
    connections,
    deleteConnection,
    toggleConnectionCriticalPath,
    updateConnection,
    selectConnection,
    selectedConnectionIds,
  } = useCanvasStore();

  // 分组展开状态
  const [showSimple, setShowSimple] = useState(true);
  const [showCritical, setShowCritical] = useState(true);
  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSourceId, setEditSourceId] = useState<string>('');
  const [editTargetId, setEditTargetId] = useState<string>('');

  if (!isOpen) return null;

  // 分组连接线
  const simpleConnections = connections.filter(c => !c.isCriticalPath);
  const criticalConnections = connections.filter(c => c.isCriticalPath);

  const getNodeName = (id: string) => {
    const node = nodes.find(n => n.id === id);
    return node?.name || '未知';
  };

  // 开始编辑
  const startEdit = (conn: typeof connections[0]) => {
    setEditingId(conn.id);
    setEditSourceId(conn.sourceNodeId);
    setEditTargetId(conn.targetNodeId);
  };

  // 保存编辑
  const saveEdit = () => {
    if (editingId && editSourceId && editTargetId && editSourceId !== editTargetId) {
      updateConnection(editingId, {
        sourceNodeId: editSourceId,
        targetNodeId: editTargetId,
      });
    }
    setEditingId(null);
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null);
  };

  const renderConnectionItem = (conn: typeof connections[0]) => {
    const isEditing = editingId === conn.id;
    const isSelected = selectedConnectionIds.includes(conn.id);

    return (
      <div
        key={conn.id}
        className={`p-2 rounded transition-colors ${
          isSelected ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
        } group`}
        onClick={() => {
          if (!isEditing) {
            selectConnection(conn.id);
          }
        }}
      >
        {isEditing ? (
          // 编辑模式
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <select
                value={editSourceId}
                onChange={(e) => setEditSourceId(e.target.value)}
                className="flex-1 text-xs p-1 border rounded"
                onClick={(e) => e.stopPropagation()}
              >
                {nodes.map(node => (
                  <option key={node.id} value={node.id}>{node.name}</option>
                ))}
              </select>
              <span className="text-gray-400">→</span>
              <select
                value={editTargetId}
                onChange={(e) => setEditTargetId(e.target.value)}
                className="flex-1 text-xs p-1 border rounded"
                onClick={(e) => e.stopPropagation()}
              >
                {nodes.map(node => (
                  <option key={node.id} value={node.id}>{node.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); saveEdit(); }}
                className="p-1 text-green-500 hover:text-green-600"
                title="保存"
              >
                <Check size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                className="p-1 text-gray-400 hover:text-gray-500"
                title="取消"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          // 显示模式
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {conn.isCriticalPath ? (
                <Route size={14} className="text-red-500 flex-shrink-0" />
              ) : (
                <ArrowRight size={14} className="text-gray-500 flex-shrink-0" />
              )}
              <div className="text-xs truncate">
                <span className="font-medium">{getNodeName(conn.sourceNodeId)}</span>
                <span className="text-gray-400 mx-1">→</span>
                <span className="font-medium">{getNodeName(conn.targetNodeId)}</span>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => { e.stopPropagation(); startEdit(conn); }}
                className="p-1 text-blue-400 hover:text-blue-500"
                title="编辑"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleConnectionCriticalPath(conn.id); }}
                className={`p-1 rounded ${conn.isCriticalPath ? 'text-red-500 hover:text-gray-500' : 'text-gray-400 hover:text-red-500'}`}
                title={conn.isCriticalPath ? '取消关键路径' : '设为关键路径'}
              >
                <Route size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteConnection(conn.id); }}
                className="p-1 text-red-400 hover:text-red-500"
                title="删除"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <h3 className="font-semibold text-sm">连线清单</h3>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded">
          <X size={14} />
        </button>
      </div>

      {/* 连接线列表 */}
      <div className="flex-1 overflow-auto p-2">
        {connections.length === 0 ? (
          <div className="text-gray-400 text-center py-8 text-sm">暂无连接线</div>
        ) : (
          <div className="space-y-3">
            {/* 普通连线分组 */}
            <div>
              <button
                onClick={() => setShowSimple(!showSimple)}
                className="flex items-center gap-1 text-sm font-medium text-gray-700 w-full mb-1"
              >
                {showSimple ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>普通连线</span>
                <span className="text-gray-400 text-xs">({simpleConnections.length})</span>
              </button>
              {showSimple && (
                <div className="space-y-1 ml-1">
                  {simpleConnections.length === 0 ? (
                    <div className="text-xs text-gray-400 py-1 px-2">无</div>
                  ) : (
                    simpleConnections.map(renderConnectionItem)
                  )}
                </div>
              )}
            </div>

            {/* 关键路径分组 */}
            <div>
              <button
                onClick={() => setShowCritical(!showCritical)}
                className="flex items-center gap-1 text-sm font-medium text-red-600 w-full mb-1"
              >
                {showCritical ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>关键路径</span>
                <span className="text-red-400 text-xs">({criticalConnections.length})</span>
              </button>
              {showCritical && (
                <div className="space-y-1 ml-1">
                  {criticalConnections.length === 0 ? (
                    <div className="text-xs text-gray-400 py-1 px-2">无</div>
                  ) : (
                    criticalConnections.map(renderConnectionItem)
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="p-3 border-t bg-gray-50">
        <div className="text-xs text-gray-500">
          <div className="flex items-center gap-1 mb-1">
            <ArrowRight size={12} className="text-gray-500" />
            <span>普通连线：黑色细线</span>
          </div>
          <div className="flex items-center gap-1">
            <Route size={12} className="text-red-500" />
            <span>关键路径：红色粗线</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionPanel;
