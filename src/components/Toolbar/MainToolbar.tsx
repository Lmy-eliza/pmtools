import React, { useState, useEffect, useRef } from 'react';
import {
  Diamond,
  Triangle,
  Square,
  ZoomIn,
  ZoomOut,
  Copy,
  FileOutput,
  Upload,
  Download,
  Eye,
  EyeOff,
  Clock,
  Undo2,
  Redo2,
  Plus,
  MousePointer2,
  Save,
  FolderOpen,
  HelpCircle,
  Settings,
  Link,
  History,
  MoreHorizontal,
  Star,
  Circle,
  Hexagon,
  ChevronDown,
  Calendar,
  Route,
  Shapes,
  ArrowRight,
  Home,
  ClipboardPaste,
} from 'lucide-react';
import { useCanvasStore } from '../../stores/canvasStore';
import type { ToolType, TimelineView } from '../../types';

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  icon,
  label,
  active,
  onClick,
  disabled,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        className={`toolbar-btn ${active ? 'active' : ''}`}
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={label}
      >
        {icon}
      </button>
      {showTooltip && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </div>
  );
};

interface MainToolbarProps {
  onExport: () => void;
  onImport: () => void;
  onExportJSON: () => void;
  onCopyAsImage: () => void;
  onSaveProject: () => void;
  onOpenProjectList: () => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  onOpenConstraintPanel: () => void;
  onOpenVersionHistory: () => void;
  onOpenConnectionPanel?: () => void;  // 问题10：打开连线清单面板
  onPasteJSON?: () => void;  // 需求6：粘贴 JSON 导入
  showConstraintPanel?: boolean;
  showVersionHistory?: boolean;
  showConnectionPanel?: boolean;  // 问题10：连线清单面板状态
}

export const MainToolbar: React.FC<MainToolbarProps> = ({
  onExport,
  onImport,
  onExportJSON,
  onCopyAsImage,
  onSaveProject,
  onOpenProjectList,
  onOpenHelp,
  onOpenSettings,
  onOpenConstraintPanel,
  onOpenVersionHistory,
  onOpenConnectionPanel,
  onPasteJSON,
  showConstraintPanel,
  showVersionHistory,
  showConnectionPanel,
}) => {
  const {
    currentTool,
    setCurrentTool,
    settings,
    updateSettings,
    undo,
    redo,
    history,
    historyIndex,
    addSwimlane,
    connectionStyle,
    setConnectionStyle,
  } = useCanvasStore();

  const [showMoreShapes, setShowMoreShapes] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showConnectionMenu, setShowConnectionMenu] = useState(false);  // 问题10：连接线菜单
  const [customEmoji, setCustomEmoji] = useState('');

  // 需求5：下拉菜单 ref，用于检测点击外部关闭
  const moreShapesRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const connectionMenuRef = useRef<HTMLDivElement>(null);

  // 需求5：点击外部关闭所有下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreShapesRef.current && !moreShapesRef.current.contains(e.target as Node)) {
        setShowMoreShapes(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setShowViewMenu(false);
      }
      if (connectionMenuRef.current && !connectionMenuRef.current.contains(e.target as Node)) {
        setShowConnectionMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleZoomIn = () => {
    updateSettings({ zoom: Math.min(settings.zoom + 0.1, 2) });
  };

  const handleZoomOut = () => {
    updateSettings({ zoom: Math.max(settings.zoom - 0.1, 0.5) });
  };

  const toggleConstraints = () => {
    updateSettings({ showConstraints: !settings.showConstraints });
  };

  const toggleIntervals = () => {
    updateSettings({ showIntervals: !settings.showIntervals });
  };

  // 需求18 & 19：视图切换和单位联动
  // 问题5/9修复：使用动态单位宽度，不再手动设置monthWidth
  const handleViewChange = (view: TimelineView) => {
    const viewIntervalUnits: Record<TimelineView, 'day' | 'week' | 'month'> = {
      day: 'day',
      week: 'week',
      month: 'month',
      quarter: 'month',
    };

    const newSettings: Partial<typeof settings> = {
      timelineView: view,
    };

    // 需求19：如果开启了自动联动，同时更新间隔单位
    if (settings.autoLinkUnit) {
      newSettings.intervalUnit = viewIntervalUnits[view];
    }

    updateSettings(newSettings);
    setShowViewMenu(false);
  };

  const viewLabels: Record<TimelineView, string> = {
    day: '天',
    week: '周',
    month: '月',
    quarter: '季',
  };

  // 问题10：连接线不再在 tools 数组中，改为单独的下拉菜单
  const tools: { type: ToolType; icon: React.ReactNode; label: string }[] = [
    { type: 'select', icon: <MousePointer2 size={18} />, label: '选择 (V)' },
    { type: 'diamond', icon: <Diamond size={18} />, label: '菱形节点 (D)' },
    { type: 'pentagon', icon: <Home size={18} />, label: '阀门节点 (G)' },
    { type: 'rectangle', icon: <Square size={18} />, label: '长方形节点 (R)' },
  ];

  const moreShapes = [
    { type: 'triangle' as ToolType, icon: <Triangle size={16} />, label: '三角形' },
    { type: 'star' as ToolType, icon: <Star size={16} />, label: '五角星' },
    { type: 'circle' as ToolType, icon: <Circle size={16} />, label: '圆形' },
    { type: 'hexagon' as ToolType, icon: <Hexagon size={16} />, label: '六边形' },
  ];

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-1">
      {/* 项目操作 */}
      <ToolButton
        icon={<FolderOpen size={18} />}
        label="我的项目"
        onClick={onOpenProjectList}
      />
      <ToolButton
        icon={<Save size={18} />}
        label="保存项目 (Ctrl+S)"
        onClick={onSaveProject}
      />
      <ToolButton
        icon={<Settings size={18} />}
        label="周期设置"
        onClick={onOpenSettings}
      />

      <div className="toolbar-divider" />

      {/* 节点工具 */}
      {tools.map((tool) => (
        <ToolButton
          key={tool.type}
          icon={tool.icon}
          label={tool.label}
          active={currentTool === tool.type}
          onClick={() => setCurrentTool(tool.type)}
        />
      ))}

      {/* 问题10：连接线下拉菜单 */}
      <div className="relative" ref={connectionMenuRef}>
        <button
          className={`toolbar-btn flex items-center gap-1 ${showConnectionMenu || currentTool === 'connection' ? 'active' : ''}`}
          onClick={() => setShowConnectionMenu(!showConnectionMenu)}
          title="连接线 (L)"
        >
          <ArrowRight size={18} />
          <ChevronDown size={12} />
        </button>
        {showConnectionMenu && (
          <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-2 z-50 min-w-[140px]">
            <button
              className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded w-full text-left ${currentTool === 'connection' && connectionStyle === 'simple' ? 'bg-blue-50 text-blue-600' : ''}`}
              onClick={() => {
                setConnectionStyle('simple');
                setCurrentTool('connection');
                setShowConnectionMenu(false);
              }}
            >
              <ArrowRight size={14} className="text-gray-600" />
              <span className="text-sm">简单连线</span>
            </button>
            <button
              className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded w-full text-left ${currentTool === 'connection' && connectionStyle === 'critical' ? 'bg-blue-50 text-blue-600' : ''}`}
              onClick={() => {
                setConnectionStyle('critical');
                setCurrentTool('connection');
                setShowConnectionMenu(false);
              }}
            >
              <Route size={14} className="text-red-500" />
              <span className="text-sm">关键路径</span>
            </button>
            <hr className="my-1" />
            <button
              className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded w-full text-left ${showConnectionPanel ? 'bg-blue-50 text-blue-600' : ''}`}
              onClick={() => {
                if (onOpenConnectionPanel) {
                  onOpenConnectionPanel();
                }
                setShowConnectionMenu(false);
              }}
            >
              <Link size={14} />
              <span className="text-sm">连线清单</span>
            </button>
          </div>
        )}
      </div>

      {/* 更多形状 - 问题9修复：使用Shapes图标 */}
      <div className="relative" ref={moreShapesRef}>
        <ToolButton
          icon={<Shapes size={18} />}
          label="更多形状"
          active={showMoreShapes || ['triangle', 'star', 'circle', 'hexagon', 'emoji'].includes(currentTool)}
          onClick={() => setShowMoreShapes(!showMoreShapes)}
        />
        {showMoreShapes && (
          <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-2 z-50 min-w-[160px]">
            {moreShapes.map(shape => (
              <button
                key={shape.type}
                className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded w-full text-left ${currentTool === shape.type ? 'bg-blue-50 text-blue-600' : ''}`}
                onClick={() => {
                  setCurrentTool(shape.type);
                  setShowMoreShapes(false);
                }}
              >
                {shape.icon}
                <span className="text-sm">{shape.label}</span>
              </button>
            ))}

            <hr className="my-2" />

            {/* Emoji 自定义输入 */}
            <div className="px-3 py-2">
              <label className="text-xs text-gray-500 block mb-1">自定义 Emoji</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="😀"
                  className="input flex-1 text-center text-lg"
                  maxLength={10}
                  value={customEmoji}
                  onChange={(e) => setCustomEmoji(e.target.value)}
                />
                <button
                  className="btn btn-primary text-sm px-3"
                  onClick={() => {
                    if (customEmoji) {
                      useCanvasStore.setState({ currentEmoji: customEmoji });
                      setCurrentTool('emoji');
                      setShowMoreShapes(false);
                    }
                  }}
                >
                  用
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* 添加泳道 */}
      <ToolButton
        icon={<Plus size={18} />}
        label="添加泳道"
        onClick={() => addSwimlane()}
      />

      <div className="toolbar-divider" />

      {/* 缩放 */}
      <ToolButton
        icon={<ZoomOut size={18} />}
        label="缩小"
        onClick={handleZoomOut}
        disabled={settings.zoom <= 0.5}
      />
      <span className="text-sm text-gray-500 w-12 text-center">
        {Math.round(settings.zoom * 100)}%
      </span>
      <ToolButton
        icon={<ZoomIn size={18} />}
        label="放大"
        onClick={handleZoomIn}
        disabled={settings.zoom >= 2}
      />

      <div className="toolbar-divider" />

      {/* 需求18：时间轴视图切换 */}
      <div className="relative" ref={viewMenuRef}>
        <button
          className={`toolbar-btn flex items-center gap-1 ${showViewMenu ? 'active' : ''}`}
          onClick={() => setShowViewMenu(!showViewMenu)}
          title="时间轴视图"
        >
          <Calendar size={18} />
          <span className="text-xs">{viewLabels[settings.timelineView || 'month']}</span>
          <ChevronDown size={12} />
        </button>
        {showViewMenu && (
          <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-2 z-50 min-w-[120px]">
            {(['day', 'week', 'month', 'quarter'] as TimelineView[]).map((view) => (
              <button
                key={view}
                className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded w-full text-left ${settings.timelineView === view ? 'bg-blue-50 text-blue-600' : ''}`}
                onClick={() => handleViewChange(view)}
              >
                <span className="text-sm">{viewLabels[view]}视图</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* 导出 */}
      <ToolButton
        icon={<Copy size={18} />}
        label="复制为图片"
        onClick={onCopyAsImage}
      />
      <ToolButton
        icon={<FileOutput size={18} />}
        label="导出 DrawIO"
        onClick={onExport}
      />

      {/* 更多功能下拉菜单 */}
      <div className="relative" ref={moreMenuRef}>
        <button
          className={`toolbar-btn flex items-center gap-1 ${showMoreMenu ? 'active' : ''}`}
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          title="更多功能"
        >
          <MoreHorizontal size={18} />
          <ChevronDown size={12} />
        </button>
        {showMoreMenu && (
          <div className="absolute top-full right-0 mt-1 bg-white border rounded-lg shadow-lg p-2 z-50 min-w-[160px]">
            <button
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded w-full text-left"
              onClick={() => {
                onImport();
                setShowMoreMenu(false);
              }}
            >
              <Upload size={16} />
              <span className="text-sm">导入 JSON</span>
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded w-full text-left"
              onClick={() => {
                onExportJSON();
                setShowMoreMenu(false);
              }}
            >
              <Download size={16} />
              <span className="text-sm">导出 JSON</span>
            </button>
            {onPasteJSON && (
              <>
                <hr className="my-1" />
                <button
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded w-full text-left"
                  onClick={() => {
                    onPasteJSON();
                    setShowMoreMenu(false);
                  }}
                >
                  <ClipboardPaste size={16} />
                  <span className="text-sm">粘贴 JSON</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* 显示控制 */}
      <ToolButton
        icon={settings.showConstraints ? <Eye size={18} /> : <EyeOff size={18} />}
        label={settings.showConstraints ? '隐藏约束' : '显示约束'}
        active={settings.showConstraints}
        onClick={toggleConstraints}
      />
      <ToolButton
        icon={<Clock size={18} />}
        label={settings.showIntervals ? '隐藏间隔' : '显示间隔'}
        active={settings.showIntervals}
        onClick={toggleIntervals}
      />

      <div className="toolbar-divider" />

      {/* 约束关系 */}
      <ToolButton
        icon={<Link size={18} />}
        label="约束关系"
        active={showConstraintPanel}
        onClick={onOpenConstraintPanel}
      />

      {/* 版本历史 */}
      <ToolButton
        icon={<History size={18} />}
        label="版本历史"
        active={showVersionHistory}
        onClick={onOpenVersionHistory}
      />

      <div className="toolbar-divider" />

      {/* 撤销/重做 */}
      <ToolButton
        icon={<Undo2 size={18} />}
        label="撤销 (Ctrl+Z)"
        onClick={undo}
        disabled={historyIndex <= 0}
      />
      <ToolButton
        icon={<Redo2 size={18} />}
        label="重做 (Ctrl+Shift+Z)"
        onClick={redo}
        disabled={historyIndex >= history.length - 1}
      />

      {/* 右侧空白区域 */}
      <div className="flex-1" />

      {/* 帮助 */}
      <ToolButton
        icon={<HelpCircle size={18} />}
        label="使用帮助 (? 或 F1)"
        onClick={onOpenHelp}
      />
    </div>
  );
};

export default MainToolbar;
