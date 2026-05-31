import React from 'react';
import { useCanvasStore } from '../../stores/canvasStore';
import { colorPresets } from '../../data/presets';
import { formatDate } from '../../utils/dateUtils';
import { X, Trash2, Link, Minus } from 'lucide-react';

export const NodePropertyPanel: React.FC = () => {
  const {
    nodes,
    selectedNodeIds,
    updateNode,
    deleteNode,
    clearSelection,
    constraints,
    addConstraint,
    deleteConstraint,
    updateConstraint,
    selectedConstraintId,
    selectConstraint,
    connections,
    selectedConnectionIds,
    deleteConnection,
    deleteSelectedConnections,
    selectConnection,
  } = useCanvasStore();

  // 问题12：无选中时不渲染面板
  if (selectedNodeIds.length === 0 && selectedConnectionIds.length === 0 && !selectedConstraintId) {
    return null;
  }

  // 问题11：如果选中了约束
  if (selectedConstraintId) {
    const selectedConstraint = constraints.find(c => c.id === selectedConstraintId);
    if (!selectedConstraint) return null;

    return (
      <div className="w-64 bg-white border-l border-gray-200 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <span className="font-semibold text-sm">约束属性</span>
          <button
            onClick={() => selectConstraint(null)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 p-4 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">起点</label>
            <select
              value={selectedConstraint.sourceNodeId}
              onChange={(e) => updateConstraint(selectedConstraintId, { sourceNodeId: e.target.value })}
              className="input w-full text-sm"
            >
              {nodes.map(n => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">终点</label>
            <select
              value={selectedConstraint.targetNodeId}
              onChange={(e) => updateConstraint(selectedConstraintId, { targetNodeId: e.target.value })}
              className="input w-full text-sm"
            >
              {nodes.filter(n => n.id !== selectedConstraint.sourceNodeId).map(n => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">时间间隔</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                value={selectedConstraint.offsetMonths}
                onChange={(e) => updateConstraint(selectedConstraintId, { offsetMonths: parseFloat(e.target.value) || 0 })}
                className="input flex-1 text-sm"
              />
              <span className="text-sm text-gray-500 flex items-center">月</span>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => {
              deleteConstraint(selectedConstraintId);
            }}
            className="w-full btn btn-secondary flex items-center justify-center gap-2 text-red-500"
          >
            <Trash2 size={16} />
            删除约束
          </button>
        </div>
      </div>
    );
  }

  // 问题14：如果选中了连接线（支持多选）
  if (selectedConnectionIds.length > 0) {
    // 多选时显示批量操作界面
    if (selectedConnectionIds.length > 1) {
      return (
        <div className="w-64 bg-white border-l border-gray-200 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <span className="font-semibold text-sm">已选择 {selectedConnectionIds.length} 条连接线</span>
            <button
              onClick={() => selectConnection(null)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 p-4">
            <div className="text-sm text-gray-500 mb-4">
              按住 Ctrl 点击可以多选连接线
            </div>
            <div className="space-y-1">
              {selectedConnectionIds.map(id => {
                const conn = connections.find(c => c.id === id);
                if (!conn) return null;
                const source = nodes.find(n => n.id === conn.sourceNodeId);
                const target = nodes.find(n => n.id === conn.targetNodeId);
                return (
                  <div key={id} className="text-xs p-2 bg-gray-50 rounded">
                    {source?.name || '?'} → {target?.name || '?'}
                    {conn.isCriticalPath && <span className="text-red-500 ml-1">(关键)</span>}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => {
                deleteSelectedConnections();
              }}
              className="w-full btn btn-secondary flex items-center justify-center gap-2 text-red-500"
            >
              <Trash2 size={16} />
              删除选中的 {selectedConnectionIds.length} 条连接线
            </button>
          </div>
        </div>
      );
    }

    // 单选时显示详情
    const selectedConnection = connections.find(c => c.id === selectedConnectionIds[0]);
    if (!selectedConnection) return null;

    const sourceNode = nodes.find(n => n.id === selectedConnection.sourceNodeId);
    const targetNode = nodes.find(n => n.id === selectedConnection.targetNodeId);

    return (
      <div className="w-64 bg-white border-l border-gray-200 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <span className="font-semibold text-sm">连接线属性</span>
          <button
            onClick={() => selectConnection(null)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 p-4 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">起点</label>
            <div className="text-sm">{sourceNode?.name || '未知'}</div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">终点</label>
            <div className="text-sm">{targetNode?.name || '未知'}</div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">类型</label>
            <div className="text-sm">
              {selectedConnection.isCriticalPath ? (
                <span className="text-red-500 font-medium">关键路径</span>
              ) : (
                <span>普通连接线</span>
              )}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => {
              deleteConnection(selectedConnectionIds[0]);
            }}
            className="w-full btn btn-secondary flex items-center justify-center gap-2 text-red-500"
          >
            <Trash2 size={16} />
            删除连接线
          </button>
        </div>
      </div>
    );
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeIds[0]);

  if (!selectedNode) {
    return null;
  }

  // 获取与当前节点相关的约束
  const relatedConstraints = constraints.filter(
    (c) => c.sourceNodeId === selectedNode.id || c.targetNodeId === selectedNode.id
  );

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      updateNode(selectedNode.id, { date: newDate });
    }
  };

  const handleAddConstraint = () => {
    // 简单实现：提示用户输入约束信息
    const targetNodeName = prompt('输入目标节点名称:');
    const targetNode = nodes.find((n) => n.name === targetNodeName && n.id !== selectedNode.id);

    if (!targetNode) {
      alert('未找到该节点');
      return;
    }

    const offsetStr = prompt('输入时间间隔（月数，正数表示之后，负数表示之前）:');
    const offset = parseInt(offsetStr || '0', 10);

    if (isNaN(offset)) {
      alert('无效的时间间隔');
      return;
    }

    addConstraint(selectedNode.id, targetNode.id, offset);
  };

  return (
    <div className="w-64 bg-white border-l border-gray-200 flex flex-col">
      {/* 面板头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <span className="font-semibold text-sm">节点属性</span>
        <button
          onClick={clearSelection}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X size={16} />
        </button>
      </div>

      {/* 属性编辑 */}
      <div className="flex-1 p-4 space-y-4 overflow-auto">
        {/* 名称 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">名称</label>
          <input
            type="text"
            value={selectedNode.name}
            onChange={(e) => updateNode(selectedNode.id, { name: e.target.value })}
            className="input"
          />
        </div>

        {/* 日期 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">日期</label>
          <input
            type="date"
            value={formatDate(selectedNode.date, 'yyyy-MM-dd')}
            onChange={handleDateChange}
            className="input"
          />
        </div>

        {/* 颜色 */}
        <div>
          <label className="block text-xs text-gray-500 mb-2">颜色</label>
          <div className="color-picker">
            {colorPresets.map((color) => (
              <button
                key={color}
                className={`color-swatch ${selectedNode.color === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => updateNode(selectedNode.id, { color })}
              />
            ))}
          </div>
        </div>

        {/* 宽度（仅长方形） - 问题6修复：保留2位小数 */}
        {selectedNode.type === 'rectangle' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">宽度（像素）</label>
            <input
              type="number"
              value={Number((selectedNode.width || 100).toFixed(2))}
              onChange={(e) =>
                updateNode(selectedNode.id, { width: Math.max(50, parseFloat(e.target.value) || 100) })
              }
              className="input"
              min={50}
              step={1}
            />
          </div>
        )}

        {/* 相关连接线 - 第二轮新增 */}
        {(() => {
          const relatedConnections = connections.filter(
            (c) => c.sourceNodeId === selectedNode.id || c.targetNodeId === selectedNode.id
          );
          return (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs text-gray-500">相关连接线</label>
              </div>

              {relatedConnections.length === 0 ? (
                <div className="text-xs text-gray-400">暂无连接线</div>
              ) : (
                <div className="space-y-2">
                  {relatedConnections.map((conn) => {
                    const isSource = conn.sourceNodeId === selectedNode.id;
                    const otherNodeId = isSource ? conn.targetNodeId : conn.sourceNodeId;
                    const otherNode = nodes.find((n) => n.id === otherNodeId);

                    return (
                      <div
                        key={conn.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                      >
                        <span className="flex items-center gap-1">
                          <Minus size={12} className={conn.isCriticalPath ? 'text-red-500' : ''} />
                          {isSource ? '→' : '←'} {otherNode?.name || '未知'}
                          {conn.isCriticalPath && (
                            <span className="text-red-500 text-xs">(关键)</span>
                          )}
                        </span>
                        <button
                          onClick={() => deleteConnection(conn.id)}
                          className="text-red-400 hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* 时间约束 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs text-gray-500">时间约束</label>
            <button
              onClick={handleAddConstraint}
              className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
            >
              <Link size={12} />
              添加约束
            </button>
          </div>

          {relatedConstraints.length === 0 ? (
            <div className="text-xs text-gray-400">暂无约束关系</div>
          ) : (
            <div className="space-y-2">
              {relatedConstraints.map((constraint) => {
                const isSource = constraint.sourceNodeId === selectedNode.id;
                const otherNodeId = isSource ? constraint.targetNodeId : constraint.sourceNodeId;
                const otherNode = nodes.find((n) => n.id === otherNodeId);

                return (
                  <div
                    key={constraint.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                  >
                    <span>
                      {isSource ? '→' : '←'} {otherNode?.name || '未知'}
                      <span className="text-gray-400 ml-1">
                        ({constraint.offsetMonths}个月)
                      </span>
                    </span>
                    <button
                      onClick={() => deleteConstraint(constraint.id)}
                      className="text-red-400 hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 删除按钮 */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => {
            deleteNode(selectedNode.id);
            clearSelection();
          }}
          className="w-full btn btn-secondary flex items-center justify-center gap-2 text-red-500"
        >
          <Trash2 size={16} />
          删除节点
        </button>
      </div>
    </div>
  );
};

export default NodePropertyPanel;
