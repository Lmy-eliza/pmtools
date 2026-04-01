import React, { useState } from 'react';
import { useCanvasStore } from '../../stores/canvasStore';
import { X, Trash2, Target, Plus, Edit2, Check } from 'lucide-react';

interface ConstraintPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCanvasSelect: () => void;
}

export const ConstraintPanel: React.FC<ConstraintPanelProps> = ({
  isOpen,
  onClose,
  onStartCanvasSelect,
}) => {
  const { nodes, constraints, addConstraint, deleteConstraint, updateConstraint, settings } = useCanvasStore();
  const [showAddForm, setShowAddForm] = useState(false);

  // 新建表单状态
  const [sourceNodeId, setSourceNodeId] = useState('');
  const [targetNodeId, setTargetNodeId] = useState('');
  const [offsetValue, setOffsetValue] = useState('');
  const [offsetUnit, setOffsetUnit] = useState<'day' | 'week' | 'month'>('month');

  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSourceNodeId, setEditSourceNodeId] = useState('');
  const [editTargetNodeId, setEditTargetNodeId] = useState('');
  const [editOffsetValue, setEditOffsetValue] = useState('');
  const [editOffsetUnit, setEditOffsetUnit] = useState<'day' | 'week' | 'month'>('month');

  // 转换为月数存储（内部统一用月）
  const convertToMonths = (value: number, unit: 'day' | 'week' | 'month'): number => {
    switch (unit) {
      case 'day': return value / 30;
      case 'week': return value / 4.33;
      case 'month': return value;
    }
  };

  // 从月数转换为显示值
  const formatConstraintValue = (months: number): string => {
    const unit = settings.intervalUnit;
    let value: number;
    let unitLabel: string;

    switch (unit) {
      case 'day':
        value = months * 30;
        unitLabel = '天';
        break;
      case 'week':
        value = months * 4.33;
        unitLabel = '周';
        break;
      default:
        value = months;
        unitLabel = '月';
    }

    return `${value.toFixed(settings.intervalDecimals)} ${unitLabel}`;
  };

  const handleAdd = () => {
    if (!sourceNodeId || !targetNodeId || !offsetValue) return;
    const months = convertToMonths(parseFloat(offsetValue), offsetUnit);
    addConstraint(sourceNodeId, targetNodeId, months);
    setShowAddForm(false);
    resetForm();
  };

  const resetForm = () => {
    setSourceNodeId('');
    setTargetNodeId('');
    setOffsetValue('');
    setOffsetUnit('month');
  };

  // 开始编辑约束
  const startEditing = (constraintId: string) => {
    const constraint = constraints.find(c => c.id === constraintId);
    if (!constraint) return;

    setEditingId(constraintId);
    setEditSourceNodeId(constraint.sourceNodeId);
    setEditTargetNodeId(constraint.targetNodeId);
    setEditOffsetUnit('month');
    setEditOffsetValue(constraint.offsetMonths.toString());
  };

  // 保存编辑
  const saveEditing = () => {
    if (!editingId || !editSourceNodeId || !editTargetNodeId || !editOffsetValue) return;

    const months = convertToMonths(parseFloat(editOffsetValue), editOffsetUnit);
    updateConstraint(editingId, {
      sourceNodeId: editSourceNodeId,
      targetNodeId: editTargetNodeId,
      offsetMonths: months,
    });

    setEditingId(null);
  };

  // 取消编辑
  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleCanvasSelect = () => {
    onStartCanvasSelect();
    onClose();
  };

  if (!isOpen) return null;

  // 问题7修复：改为右侧面板样式
  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <h3 className="font-semibold text-sm">约束关系</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setShowAddForm(true)}
            className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600"
            title="新建约束"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={handleCanvasSelect}
            className="p-1.5 bg-gray-200 rounded hover:bg-gray-300"
            title="画布选择"
          >
            <Target size={14} />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 新建表单 */}
      {showAddForm && (
        <div className="p-3 bg-blue-50 border-b space-y-2">
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">起始节点</label>
              <select
                value={sourceNodeId}
                onChange={(e) => setSourceNodeId(e.target.value)}
                className="input w-full text-sm"
              >
                <option value="">选择...</option>
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">终止节点</label>
              <select
                value={targetNodeId}
                onChange={(e) => setTargetNodeId(e.target.value)}
                className="input w-full text-sm"
              >
                <option value="">选择...</option>
                {nodes.filter(n => n.id !== sourceNodeId).map(n => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">间隔</label>
              <input
                type="number"
                step="0.1"
                value={offsetValue}
                onChange={(e) => setOffsetValue(e.target.value)}
                className="input w-full text-sm"
                placeholder="2.5"
              />
            </div>
            <select
              value={offsetUnit}
              onChange={(e) => setOffsetUnit(e.target.value as 'day' | 'week' | 'month')}
              className="input w-16 text-sm"
            >
              <option value="day">天</option>
              <option value="week">周</option>
              <option value="month">月</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn btn-primary btn-sm flex-1">确定</button>
            <button onClick={() => { setShowAddForm(false); resetForm(); }} className="btn btn-sm flex-1">取消</button>
          </div>
        </div>
      )}

      {/* 约束列表 */}
      <div className="flex-1 overflow-auto p-2">
        {constraints.length === 0 ? (
          <div className="text-gray-400 text-center py-8 text-sm">暂无约束关系</div>
        ) : (
          <div className="space-y-1">
            {constraints.map(constraint => {
              const source = nodes.find(n => n.id === constraint.sourceNodeId);
              const target = nodes.find(n => n.id === constraint.targetNodeId);
              const isEditing = editingId === constraint.id;

              if (isEditing) {
                // 编辑模式
                return (
                  <div key={constraint.id} className="p-2 bg-blue-50 rounded border border-blue-200 space-y-2">
                    <div className="flex gap-1">
                      <select
                        value={editSourceNodeId}
                        onChange={(e) => setEditSourceNodeId(e.target.value)}
                        className="input flex-1 text-xs"
                      >
                        {nodes.map(n => (
                          <option key={n.id} value={n.id}>{n.name}</option>
                        ))}
                      </select>
                      <span className="text-gray-400 flex items-center text-xs">→</span>
                      <select
                        value={editTargetNodeId}
                        onChange={(e) => setEditTargetNodeId(e.target.value)}
                        className="input flex-1 text-xs"
                      >
                        {nodes.filter(n => n.id !== editSourceNodeId).map(n => (
                          <option key={n.id} value={n.id}>{n.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-1 items-center">
                      <input
                        type="number"
                        step="0.1"
                        value={editOffsetValue}
                        onChange={(e) => setEditOffsetValue(e.target.value)}
                        className="input w-16 text-xs"
                      />
                      <select
                        value={editOffsetUnit}
                        onChange={(e) => setEditOffsetUnit(e.target.value as 'day' | 'week' | 'month')}
                        className="input w-14 text-xs"
                      >
                        <option value="day">天</option>
                        <option value="week">周</option>
                        <option value="month">月</option>
                      </select>
                      <div className="flex-1" />
                      <button
                        onClick={saveEditing}
                        className="p-1 bg-blue-500 text-white rounded"
                        title="保存"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1 bg-gray-200 rounded"
                        title="取消"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                );
              }

              // 显示模式
              return (
                <div key={constraint.id} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 group">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">
                      <span className="font-medium">{source?.name || '未知'}</span>
                      <span className="text-gray-400 mx-1">→</span>
                      <span className="font-medium">{target?.name || '未知'}</span>
                    </div>
                    <div className="text-xs text-orange-500 font-medium">
                      {formatConstraintValue(constraint.offsetMonths)}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => startEditing(constraint.id)}
                      className="p-1 text-blue-400 hover:text-blue-500"
                      title="编辑"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => deleteConstraint(constraint.id)}
                      className="p-1 text-red-400 hover:text-red-500"
                      title="删除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConstraintPanel;
