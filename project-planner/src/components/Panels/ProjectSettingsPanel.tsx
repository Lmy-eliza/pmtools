import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useCanvasStore } from '../../stores/canvasStore';

interface ProjectSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isNewProject?: boolean;
  onConfirm?: () => void;
}

export const ProjectSettingsPanel: React.FC<ProjectSettingsPanelProps> = ({
  isOpen,
  onClose,
  isNewProject = false,
  onConfirm,
}) => {
  const { startDate, endDate, setStartDate, setEndDate, projectName, setProjectName, settings, updateSettings } = useCanvasStore();

  const [localStartDate, setLocalStartDate] = useState(formatDateInput(startDate));
  const [localEndDate, setLocalEndDate] = useState(formatDateInput(endDate));
  const [localName, setLocalName] = useState(projectName);
  const [localIntervalUnit, setLocalIntervalUnit] = useState(settings.intervalUnit);
  const [localIntervalDecimals, setLocalIntervalDecimals] = useState(settings.intervalDecimals);

  useEffect(() => {
    if (isOpen) {
      setLocalStartDate(formatDateInput(startDate));
      setLocalEndDate(formatDateInput(endDate));
      setLocalName(projectName);
      setLocalIntervalUnit(settings.intervalUnit);
      setLocalIntervalDecimals(settings.intervalDecimals);
    }
  }, [isOpen, startDate, endDate, projectName, settings.intervalUnit, settings.intervalDecimals]);

  const handleSave = () => {
    setStartDate(new Date(localStartDate));
    setEndDate(new Date(localEndDate));
    if (localName) setProjectName(localName);
    updateSettings({
      intervalUnit: localIntervalUnit,
      intervalDecimals: localIntervalDecimals,
    });
    onConfirm?.();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-96 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            {isNewProject ? '新建项目' : '项目设置'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {isNewProject && (
            <div>
              <label className="block text-sm font-medium mb-1">项目名称</label>
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                className="input"
                placeholder="输入项目名称"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">开始日期</label>
            <input
              type="date"
              value={localStartDate}
              onChange={(e) => setLocalStartDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">结束日期</label>
            <input
              type="date"
              value={localEndDate}
              onChange={(e) => setLocalEndDate(e.target.value)}
              className="input"
            />
          </div>

          {/* 间隔显示设置 */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-medium mb-3">间隔显示设置</h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">显示单位</label>
                <select
                  value={localIntervalUnit}
                  onChange={(e) => setLocalIntervalUnit(e.target.value as 'day' | 'week' | 'month')}
                  className="input"
                >
                  <option value="day">天</option>
                  <option value="week">周</option>
                  <option value="month">月</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">小数位数</label>
                <select
                  value={localIntervalDecimals}
                  onChange={(e) => setLocalIntervalDecimals(parseInt(e.target.value) as 0 | 1 | 2)}
                  className="input"
                >
                  <option value="0">整数</option>
                  <option value="1">1位小数</option>
                  <option value="2">2位小数</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={handleCancel} className="btn btn-secondary">
            取消
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            {isNewProject ? '创建项目' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};

function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default ProjectSettingsPanel;
