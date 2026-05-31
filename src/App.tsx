import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useCanvasStore } from './stores/canvasStore';
import { useAuthStore } from './stores/authStore';
import { MainToolbar } from './components/Toolbar/MainToolbar';
import { PlannerCanvas } from './components/Canvas/PlannerCanvas';
import type { PlannerCanvasRef } from './components/Canvas/PlannerCanvas';
import { NodePropertyPanel } from './components/Panels/NodePropertyPanel';
import { HelpPanel } from './components/Panels/HelpPanel';
import { ProjectListPanel } from './components/Panels/ProjectListPanel';
import { ProjectSettingsPanel } from './components/Panels/ProjectSettingsPanel';
import { ConstraintPanel } from './components/Panels/ConstraintPanel';
import { ConnectionPanel } from './components/Panels/ConnectionPanel';
import { VersionHistoryPanel } from './components/Panels/VersionHistoryPanel';
import { ChatPanel } from './components/Chat/ChatPanel';
import { exportToDrawio, downloadFile } from './utils/exportUtils';
import { StatsBar } from './components/StatsBar';
import { importFromJSON, validateProjectJSON, saveProject, saveVersion, listVersions, deleteVersion, exportToJSON } from './utils/storage';
import { createProject as createCloudProject, updateProject as updateCloudProject } from './utils/feishuApi';
import { getCurrentUser } from './utils/feishuAuth';
import { useCloudSync } from './hooks/useCloudSync';
import { v4 as uuidv4 } from 'uuid';
import type { ProjectData, ProjectVersion } from './types';

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<PlannerCanvasRef>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showProjectList, setShowProjectList] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [showConstraintPanel, setShowConstraintPanel] = useState(false);
  const [showConnectionPanel, setShowConnectionPanel] = useState(false);  // 问题10：连线清单面板
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isNewProjectSettings, setIsNewProjectSettings] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>();
  const [currentRecordId, setCurrentRecordId] = useState<string | undefined>();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [showChat, setShowChat] = useState(false);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // URL 参数控制 Demo 模式：?mode=hiagent 隐藏 ChatPanel，?mode=chatpanel 隐藏 HiAgent
  const demoMode = new URLSearchParams(window.location.search).get('mode');

  // 飞书认证状态
  const { initialize: initAuth, handleCallback: handleAuthCallback } = useAuthStore();

  // 初始化飞书认证 + 处理 OAuth 回调
  useEffect(() => {
    // 检查是否是 OAuth 回调页面
    const params = new URLSearchParams(window.location.search);
    if (params.get('code') && window.location.pathname === '/auth/callback') {
      handleAuthCallback().then((success) => {
        // 回调处理完毕，清理 URL（去掉 code 和 state 参数）
        window.history.replaceState({}, '', '/');
        if (!success) {
          setToast({ message: '飞书登录失败，请重试', type: 'error' });
          setTimeout(() => setToast(null), 3000);
        } else {
          setToast({ message: '飞书登录成功', type: 'success' });
          setTimeout(() => setToast(null), 2000);
        }
      });
    } else {
      // 非回调页面，初始化认证状态（从 localStorage 恢复）
      initAuth();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 云端同步（轮询 + 冲突检测）
  const { isAuthenticated: isSyncEnabled } = useAuthStore();
  const {
    hasConflict,
    conflictMessage,
    loadLatestVersion,
    dismissConflict,
    markSynced,
  } = useCloudSync({
    recordId: currentRecordId,
    enabled: isSyncEnabled && !!currentRecordId,
    pollingInterval: 10000,
  });

  // 约束画布选择模式状态
  const [isConstraintSelectMode, setIsConstraintSelectMode] = useState(false);

  const {
    projectName,
    startDate,
    endDate,
    swimlanes,
    nodes,
    connections,
    constraints,
    settings,
    currentTool,
    setCurrentTool,
    undo,
    redo,
    deleteNode,
    selectedNodeIds,
    clearSelection,
    resetProject,
    selectedConnectionIds,
    deleteSelectedConnections,
  } = useCanvasStore();

  // Toast 显示函数
  const showToastMessage = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  // 自动保存函数（本地 + 云端）
  const performAutoSave = useCallback(async () => {
    const state = useCanvasStore.getState();
    const { isAuthenticated } = useAuthStore.getState();

    // 只有当有内容时才自动保存
    if (state.nodes.length === 0 && state.swimlanes.every(s =>
      s.name === '软件开发' || s.name === '硬件开发' || s.name === '测试验证'
    )) {
      return;
    }

    const id = currentProjectId || uuidv4();
    const projectData: ProjectData = {
      id,
      name: state.projectName,
      startDate: state.startDate,
      endDate: state.endDate,
      swimlanes: state.swimlanes,
      nodes: state.nodes,
      connections: state.connections,
      constraints: state.constraints,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      setAutoSaveStatus('saving');

      // 始终保存到本地
      await saveProject(projectData);
      if (!currentProjectId) {
        setCurrentProjectId(id);
      }

      // 如果已登录飞书，同时保存到云端
      if (isAuthenticated) {
        const user = getCurrentUser();
        if (user) {
          try {
            if (currentRecordId) {
              // 已有云端记录，更新
              await updateCloudProject(currentRecordId, projectData, user.openId);
            } else {
              // 没有云端记录，创建新的
              const recordId = await createCloudProject(projectData, user.openId, user.name);
              setCurrentRecordId(recordId);
            }
            markSynced(); // 通知同步 hook：本地刚保存过，不要误判为冲突
          } catch (cloudError) {
            // 云端保存失败不影响本地保存
            console.warn('云端保存失败（本地已保存）:', cloudError);
          }
        }
      }

      setAutoSaveStatus('saved');
      console.log('自动保存成功');
    } catch (error) {
      console.error('自动保存失败:', error);
      setAutoSaveStatus('idle');
    }
  }, [currentProjectId, currentRecordId]);

  // 防抖自动保存（登录态下 3 秒，离线 2 秒）
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    const { isAuthenticated } = useAuthStore.getState();
    const delay = isAuthenticated ? 3000 : 2000;
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, delay);
  }, [performAutoSave]);

  // 监听状态变化，触发自动保存
  useEffect(() => {
    triggerAutoSave();
  }, [projectName, nodes, connections, constraints, swimlanes, startDate, endDate, triggerAutoSave]);

  // 页面关闭前强制保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      performAutoSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [performAutoSave]);

  // 需求6：粘贴 JSON 导入弹窗状态
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteJsonText, setPasteJsonText] = useState('');
  const [pasteJsonError, setPasteJsonError] = useState('');

  // 快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果正在输入文本，不处理快捷键
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // 帮助快捷键
      if (e.key === '?' || e.key === 'F1') {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // ESC 关闭弹窗
      if (e.key === 'Escape') {
        if (showHelp) {
          setShowHelp(false);
          return;
        }
        if (showProjectList) {
          setShowProjectList(false);
          return;
        }
        if (showConstraintPanel) {
          setShowConstraintPanel(false);
          return;
        }
        if (showVersionHistory) {
          setShowVersionHistory(false);
          return;
        }
        if (showProjectSettings && !isNewProjectSettings) {
          setShowProjectSettings(false);
          return;
        }
        if (isConstraintSelectMode) {
          setIsConstraintSelectMode(false);
          return;
        }
        clearSelection();
        setCurrentTool('select');
        return;
      }

      // 工具快捷键
      switch (e.key.toLowerCase()) {
        case 'v':
          setCurrentTool('select');
          break;
        case 'd':
          setCurrentTool('diamond');
          break;
        case 't':
          setCurrentTool('triangle');
          break;
        case 'g':
          setCurrentTool('pentagon');
          break;
        case 'r':
          setCurrentTool('rectangle');
          break;
        case 'l':
          setCurrentTool('connection');
          break;
        case 'delete':
        case 'backspace':
          // 删除选中的节点
          if (selectedNodeIds.length > 0) {
            selectedNodeIds.forEach((id) => deleteNode(id));
            clearSelection();
          }
          // 问题14：删除选中的连接线（支持多选）
          if (selectedConnectionIds.length > 0) {
            deleteSelectedConnections();
          }
          break;
      }

      // Ctrl/Cmd 组合键
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            e.preventDefault();
            break;
          case 's':
            e.preventDefault();
            handleSaveProject();
            break;
          case 'e':
            e.preventDefault();
            handleExportDrawio();
            break;
          case 'o':
            e.preventDefault();
            setShowProjectList(true);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIds, deleteNode, clearSelection, setCurrentTool, undo, redo, showHelp, showProjectList, showProjectSettings, isNewProjectSettings, showConstraintPanel, showVersionHistory, isConstraintSelectMode, selectedConnectionIds, deleteSelectedConnections]);

  // 保存项目到本地数据库（+ 云端）
  const handleSaveProject = async () => {
    const id = currentProjectId || uuidv4();
    const { isAuthenticated } = useAuthStore.getState();
    const projectData: ProjectData = {
      id,
      name: projectName,
      startDate,
      endDate,
      swimlanes,
      nodes,
      connections,
      constraints,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await saveProject(projectData);
      setCurrentProjectId(id);

      // 登录态下同步到云端
      if (isAuthenticated) {
        const user = getCurrentUser();
        if (user) {
          try {
            if (currentRecordId) {
              await updateCloudProject(currentRecordId, projectData, user.openId);
            } else {
              const recordId = await createCloudProject(projectData, user.openId, user.name);
              setCurrentRecordId(recordId);
            }
            showToastMessage('项目已保存（本地+云端）', 'success');
          } catch {
            showToastMessage('本地已保存，云端同步失败', 'error');
          }
        }
      } else {
        showToastMessage('项目已保存', 'success');
      }
    } catch (error) {
      console.error('保存失败:', error);
      showToastMessage('保存失败', 'error');
    }
  };

  // 新建项目
  const handleNewProject = () => {
    if (nodes.length > 0) {
      const confirmed = confirm('当前项目未保存的更改将丢失，是否继续？');
      if (!confirmed) return;
    }
    resetProject();
    setCurrentProjectId(undefined);
    setIsNewProjectSettings(true);
    setShowProjectSettings(true);
  };

  // 加载项目
  const handleSelectProject = (project: ProjectData, recordId?: string) => {
    useCanvasStore.setState({
      projectName: project.name,
      startDate: project.startDate,
      endDate: project.endDate,
      swimlanes: project.swimlanes,
      nodes: project.nodes,
      connections: project.connections,
      constraints: project.constraints,
      selectedNodeIds: [],
      history: [],
      historyIndex: -1,
    });
    setCurrentProjectId(project.id);
    setCurrentRecordId(recordId);
  };

  // 统一导入入口：文件导入、粘贴导入、AI 对话导入共用
  const applyImportedProject = (data: ProjectData, newId?: string) => {
    const id = newId || data.id || uuidv4();
    useCanvasStore.setState({
      projectName: data.name || '导入的项目',
      startDate: data.startDate,
      endDate: data.endDate,
      swimlanes: data.swimlanes,
      nodes: data.nodes,
      connections: data.connections || [],
      constraints: data.constraints || [],
      selectedNodeIds: [],
      selectedConnectionIds: [],
      history: [],
      historyIndex: -1,
    });
    setCurrentProjectId(id);
    setCurrentRecordId(undefined);
  };

  // AI 对话导入回调
  const handleChatImport = (jsonString: string) => {
    try {
      const data = importFromJSON(jsonString);
      applyImportedProject(data, uuidv4());
      showToastMessage('计划已导入画布', 'success');
    } catch (err) {
      showToastMessage(err instanceof Error ? err.message : '导入失败', 'error');
    }
  };

  // 导出DrawIO - 问题15修复：确保使用最新的store状态
  const handleExportDrawio = () => {
    const state = useCanvasStore.getState();
    const xml = exportToDrawio(
      state.projectName,
      state.nodes,
      state.connections,
      state.constraints,
      state.swimlanes,
      state.settings.monthWidth,
      state.settings.swimlaneHeight,
      state.startDate,
      state.endDate,
      state.settings.timelineView || 'month',
      {
        showIntervals: state.settings.showIntervals,
        intervalUnit: state.settings.intervalUnit,
        intervalDecimals: state.settings.intervalDecimals,
      }
    );
    downloadFile(xml, `${state.projectName}.drawio`, 'application/xml');
  };

  // 导出JSON
  const handleExportJSON = () => {
    const id = currentProjectId || uuidv4();
    const projectData: ProjectData = {
      id,
      name: projectName,
      startDate,
      endDate,
      swimlanes,
      nodes,
      connections,
      constraints,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const json = exportToJSON(projectData);
    downloadFile(json, `${projectName}.json`, 'application/json');
    showToastMessage('导出成功', 'success');
  };

  // 导入
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const data = importFromJSON(content);
      applyImportedProject(data);
      showToastMessage('导入成功', 'success');
    } catch (error) {
      console.error('导入失败:', error);
      showToastMessage(error instanceof Error ? error.message : '导入失败，请检查 JSON 格式', 'error');
    }

    // 清除文件选择
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 复制为图片（纯 Konva 方案，避免 html2canvas 的 oklch 兼容问题）
  const handleCopyAsImage = async () => {
    try {
      showToastMessage('正在生成图片...', 'success');

      // 使用 Konva stage.toDataURL() 导出画布
      const stage = canvasRef.current?.getStage();
      if (!stage) throw new Error('Stage 未找到');

      // 获取内容尺寸
      const contentSize = canvasRef.current?.getContentSize();
      if (!contentSize) throw new Error('无法获取内容尺寸');

      const { width: totalWidth, height: totalHeight, leftPanelWidth } = contentSize;
      const stageWidth = totalWidth - leftPanelWidth;

      // 保存原始状态
      const originalScaleX = stage.scaleX();
      const originalScaleY = stage.scaleY();
      const originalX = stage.x();
      const originalY = stage.y();

      // 临时重置缩放和位置，以获取完整的图片
      stage.scaleX(1);
      stage.scaleY(1);
      stage.x(0);
      stage.y(0);

      const stageDataUrl = stage.toDataURL({
        pixelRatio: 2,
        width: stageWidth,
        height: totalHeight,
      });

      // 恢复原始状态
      stage.scaleX(originalScaleX);
      stage.scaleY(originalScaleY);
      stage.x(originalX);
      stage.y(originalY);

      // 创建最终画布（添加左侧泳道标签区域）
      const finalCanvas = document.createElement('canvas');
      const pixelRatio = 2;
      finalCanvas.width = totalWidth * pixelRatio;
      finalCanvas.height = totalHeight * pixelRatio;
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) throw new Error('无法创建 Canvas Context');

      // 填充白色背景
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

      // 绘制左侧泳道标签（纯 Canvas 绘制）
      ctx.scale(pixelRatio, pixelRatio);
      ctx.fillStyle = '#f9fafb'; // bg-gray-50
      ctx.fillRect(0, 0, leftPanelWidth, totalHeight);

      // 获取泳道信息并绘制标签
      const state = useCanvasStore.getState();
      const swimlaneHeight = state.settings.swimlaneHeight;
      const headerHeight = 60; // 时间轴头部高度

      // 文本换行辅助函数
      const wrapText = (
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number
      ) => {
        // 按字符逐个检测，实现与 CSS word-break: break-all 相同的效果
        const lines: string[] = [];
        let currentLine = '';

        for (const char of text) {
          const testLine = currentLine + char;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = char;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }

        // 垂直居中绘制多行文本
        const totalTextHeight = lines.length * lineHeight;
        const startY = y - totalTextHeight / 2 + lineHeight / 2;

        lines.forEach((line, index) => {
          ctx.fillText(line, x, startY + index * lineHeight);
        });
      };

      // 1. 项目名称区域（表头左上角）- 支持换行
      const projectFontSize = state.projectName.length > 20 ? 10 : 12;
      ctx.font = `bold ${projectFontSize}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = '#374151';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 绘制项目名称背景
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, leftPanelWidth, headerHeight);
      ctx.strokeStyle = '#d2d2d7';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, leftPanelWidth, headerHeight);

      // 绘制项目名称文本（支持换行）
      ctx.fillStyle = '#374151';
      wrapText(
        ctx,
        state.projectName,
        leftPanelWidth / 2,
        headerHeight / 2,
        leftPanelWidth - 16,
        projectFontSize * 1.4
      );

      // 2. 泳道名称（支持自动换行，垂直居中）
      state.swimlanes.forEach((swimlane, index) => {
        const y = headerHeight + index * swimlaneHeight;

        // 泳道背景色（交替颜色）
        ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#fafafa';
        ctx.fillRect(0, y, leftPanelWidth, swimlaneHeight);

        // 边框线
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, y, leftPanelWidth, swimlaneHeight);

        // 泳道名称（垂直居中，支持自动换行）
        ctx.fillStyle = '#374151';
        const fontSize = swimlane.name.length > 15 ? 10 : 12;
        ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        wrapText(
          ctx,
          swimlane.name,
          leftPanelWidth / 2,
          y + swimlaneHeight / 2,
          leftPanelWidth - 16,  // 左右留 8px 边距
          fontSize * 1.4        // 行高
        );
      });

      // 重置缩放
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // 绘制右侧 Stage
      const stageImage = new Image();
      await new Promise<void>((resolve, reject) => {
        stageImage.onload = () => resolve();
        stageImage.onerror = reject;
        stageImage.src = stageDataUrl;
      });
      ctx.drawImage(stageImage, leftPanelWidth * pixelRatio, 0);

      // 转换为 Blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        finalCanvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create blob'));
        }, 'image/png');
      });

      // 检查剪贴板 API 是否可用
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          showToastMessage('复制成功', 'success');
          return;
        } catch (clipboardError) {
          console.warn('剪贴板写入失败:', clipboardError);
        }
      }

      // 剪贴板不可用或失败，提供下载
      const dataUrl = finalCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${projectName}.png`;
      link.href = dataUrl;
      link.click();
      showToastMessage('已下载图片', 'success');
    } catch (error) {
      console.error('复制失败:', error);
      showToastMessage('复制失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error');
    }
  };

  // 打开项目设置
  const handleOpenSettings = () => {
    setIsNewProjectSettings(false);
    setShowProjectSettings(true);
  };

  // 版本管理处理函数
  const handleSaveVersion = async (name?: string) => {
    if (!currentProjectId) {
      showToastMessage('请先保存项目', 'error');
      return;
    }
    const state = useCanvasStore.getState();
    const projectData: ProjectData = {
      id: currentProjectId,
      name: state.projectName,
      startDate: state.startDate,
      endDate: state.endDate,
      swimlanes: state.swimlanes,
      nodes: state.nodes,
      connections: state.connections,
      constraints: state.constraints,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await saveVersion(currentProjectId, projectData, name);
    showToastMessage('版本已保存', 'success');
  };

  const handleRestoreVersion = (version: ProjectVersion) => {
    useCanvasStore.setState({
      projectName: version.data.name,
      startDate: version.data.startDate,
      endDate: version.data.endDate,
      swimlanes: version.data.swimlanes,
      nodes: version.data.nodes,
      connections: version.data.connections,
      constraints: version.data.constraints,
      selectedNodeIds: [],
      history: [],
      historyIndex: -1,
    });
    showToastMessage(`已恢复到版本 "${version.name}"`, 'success');
  };

  // 约束画布选择模式开始
  const handleStartConstraintSelect = () => {
    setIsConstraintSelectMode(true);
    setConstraintSourceNode(null);
  };

  // 约束画布选择状态
  const [constraintSourceNode, setConstraintSourceNode] = useState<string | null>(null);
  const [showConstraintInputDialog, setShowConstraintInputDialog] = useState(false);
  const [pendingConstraintTarget, setPendingConstraintTarget] = useState<string | null>(null);
  const [constraintInputValue, setConstraintInputValue] = useState('');
  const [constraintInputUnit, setConstraintInputUnit] = useState<'day' | 'week' | 'month'>('month');

  // 处理约束节点选择
  const handleConstraintNodeSelect = (nodeId: string) => {
    if (constraintSourceNode === null) {
      // 第一次点击：设置起始节点
      setConstraintSourceNode(nodeId);
    } else if (constraintSourceNode !== nodeId) {
      // 第二次点击：设置终止节点，弹出周期输入框
      setPendingConstraintTarget(nodeId);
      setShowConstraintInputDialog(true);
      setIsConstraintSelectMode(false);
    }
  };

  // 确认添加约束
  const handleConfirmConstraint = () => {
    if (!constraintSourceNode || !pendingConstraintTarget || !constraintInputValue) return;

    const { addConstraint } = useCanvasStore.getState();
    let months = parseFloat(constraintInputValue);
    if (constraintInputUnit === 'day') months = months / 30;
    if (constraintInputUnit === 'week') months = months / 4.33;

    const result = addConstraint(constraintSourceNode, pendingConstraintTarget, months);

    // 清理状态
    setConstraintSourceNode(null);
    setPendingConstraintTarget(null);
    setConstraintInputValue('');
    setShowConstraintInputDialog(false);

    if (result) {
      showToastMessage('约束关系已创建', 'success');
    } else {
      showToastMessage('无法创建约束：检测到循环依赖', 'error');
    }
  };

  // 取消约束输入
  const handleCancelConstraintInput = () => {
    setConstraintSourceNode(null);
    setPendingConstraintTarget(null);
    setConstraintInputValue('');
    setShowConstraintInputDialog(false);
  };

  // 需求6：粘贴 JSON 导入处理
  const handleOpenPasteDialog = () => {
    setPasteJsonText('');
    setPasteJsonError('');
    setShowPasteDialog(true);
  };

  const handlePasteImport = () => {
    if (!pasteJsonText.trim()) {
      setPasteJsonError('请粘贴 JSON 内容');
      return;
    }
    try {
      const parsed = JSON.parse(pasteJsonText);
      const validation = validateProjectJSON(parsed);
      if (!validation.valid) {
        setPasteJsonError(validation.errors.join('\n'));
        return;
      }
      const data = importFromJSON(pasteJsonText);
      applyImportedProject(data, uuidv4());
      setShowPasteDialog(false);
      setPasteJsonText('');
      showToastMessage('项目导入成功', 'success');
    } catch (err) {
      setPasteJsonError(err instanceof Error ? err.message : 'JSON 解析失败，请检查格式');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 工具栏 */}
      <MainToolbar
        onExport={handleExportDrawio}
        onImport={handleImport}
        onExportJSON={handleExportJSON}
        onCopyAsImage={handleCopyAsImage}
        onSaveProject={handleSaveProject}
        onOpenProjectList={() => setShowProjectList(!showProjectList)}
        onOpenHelp={() => setShowHelp(!showHelp)}
        onOpenSettings={handleOpenSettings}
        onOpenConstraintPanel={() => setShowConstraintPanel(!showConstraintPanel)}
        onOpenVersionHistory={() => setShowVersionHistory(!showVersionHistory)}
        onOpenConnectionPanel={() => setShowConnectionPanel(!showConnectionPanel)}
        onPasteJSON={handleOpenPasteDialog}
        onToggleChat={demoMode === 'hiagent' ? undefined : () => setShowChat(!showChat)}
        showChat={showChat}
        showConstraintPanel={showConstraintPanel}
        showVersionHistory={showVersionHistory}
        showConnectionPanel={showConnectionPanel}
      />

      {/* 统计栏 */}
      <StatsBar />

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 画布 */}
        <PlannerCanvas
          ref={canvasRef}
          isConstraintSelectMode={isConstraintSelectMode}
          onConstraintNodeSelect={handleConstraintNodeSelect}
        />

        {/* AI 对话面板 / 属性面板（互斥） */}
        {showChat ? (
          <ChatPanel onImportJSON={handleChatImport} onClose={() => setShowChat(false)} />
        ) : (
          <NodePropertyPanel />
        )}

        {/* 问题10：连线清单面板 */}
        <ConnectionPanel
          isOpen={showConnectionPanel}
          onClose={() => setShowConnectionPanel(false)}
        />

        {/* 问题7修复：约束关系面板作为右侧面板 */}
        <ConstraintPanel
          isOpen={showConstraintPanel}
          onClose={() => setShowConstraintPanel(false)}
          onStartCanvasSelect={handleStartConstraintSelect}
        />
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 状态栏 */}
      <div className="h-6 bg-white border-t border-gray-200 flex items-center px-4 text-xs text-gray-500">
        <span className="mr-4">
          工具: {currentTool === 'select' ? '选择' : currentTool === 'diamond' ? '节点' : currentTool === 'triangle' ? '三角形' : currentTool === 'rectangle' ? '活动' : currentTool === 'pentagon' ? '里程碑' : currentTool === 'connection' ? '连线' : currentTool}
        </span>
        <span className="mr-4">节点: {nodes.length}</span>
        <span className="mr-4">连接: {connections.length}</span>
        <span className="mr-4">缩放: {Math.round(settings.zoom * 100)}%</span>
        {/* 自动保存状态 */}
        <span className={`mr-4 ${autoSaveStatus === 'saving' ? 'text-blue-500' : autoSaveStatus === 'saved' ? 'text-green-500' : ''}`}>
          {autoSaveStatus === 'saving' ? '保存中...' : autoSaveStatus === 'saved' ? '已保存' : ''}
        </span>
        {/* 云端同步标记 */}
        {currentRecordId && (
          <span className="mr-4 text-blue-400 flex items-center gap-1">
            ☁️ 云端同步
          </span>
        )}
        <div className="flex-1" />
        <span className="text-gray-400">按 ? 或 F1 查看帮助</span>
      </div>

      {/* Toast 提示 */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* 帮助面板 */}
      <HelpPanel isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* 项目列表面板 */}
      <ProjectListPanel
        isOpen={showProjectList}
        onClose={() => setShowProjectList(false)}
        onSelectProject={handleSelectProject}
        onNewProject={handleNewProject}
        currentProjectId={currentProjectId}
      />

      {/* 项目设置面板 */}
      <ProjectSettingsPanel
        isOpen={showProjectSettings}
        onClose={() => {
          setShowProjectSettings(false);
          setIsNewProjectSettings(false);
        }}
        isNewProject={isNewProjectSettings}
      />

      {/* 版本历史面板 */}
      <VersionHistoryPanel
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        projectId={currentProjectId}
        onSaveVersion={handleSaveVersion}
        onRestoreVersion={handleRestoreVersion}
        loadVersions={listVersions}
        deleteVersion={deleteVersion}
      />

      {/* 云端同步冲突提示 */}
      {hasConflict && conflictMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-white border border-orange-300 rounded-lg shadow-xl z-50 p-4 max-w-md">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h4 className="font-medium text-gray-800 mb-1">项目已被更新</h4>
              <p className="text-sm text-gray-600 mb-3">{conflictMessage}</p>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const success = await loadLatestVersion();
                    if (success) {
                      showToastMessage('已加载最新版本', 'success');
                    } else {
                      showToastMessage('加载失败', 'error');
                    }
                  }}
                  className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
                >
                  加载最新版本
                </button>
                <button
                  onClick={dismissConflict}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
                >
                  保持我的版本
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 约束画布选择模式提示 */}
      {isConstraintSelectMode && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-3">
          <span>
            {constraintSourceNode
              ? `已选择起始节点，请点击终止节点`
              : '请在画布上点击选择起始节点'}
          </span>
          <button
            onClick={() => {
              setIsConstraintSelectMode(false);
              setConstraintSourceNode(null);
            }}
            className="underline hover:no-underline"
          >
            取消
          </button>
        </div>
      )}

      {/* 约束周期输入对话框 */}
      {showConstraintInputDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-4">设置约束周期</h3>
            <div className="mb-4">
              <label className="text-sm text-gray-600 block mb-1">时间间隔</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={constraintInputValue}
                  onChange={(e) => {
                    // 只允许数字和小数点
                    const value = e.target.value;
                    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                      setConstraintInputValue(value);
                    }
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                  onKeyUp={(e) => e.stopPropagation()}
                  onKeyPress={(e) => e.stopPropagation()}
                  onInput={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  className="input w-24 min-w-[96px]"
                  placeholder="如 2.5"
                  autoFocus
                />
                <select
                  value={constraintInputUnit}
                  onChange={(e) => setConstraintInputUnit(e.target.value as 'day' | 'week' | 'month')}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="input w-16"
                >
                  <option value="day">天</option>
                  <option value="week">周</option>
                  <option value="month">月</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={handleCancelConstraintInput} className="btn">
                取消
              </button>
              <button onClick={handleConfirmConstraint} className="btn btn-primary">
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 需求6：粘贴 JSON 导入弹窗 */}
      {showPasteDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowPasteDialog(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-[480px]" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-2">粘贴 JSON 导入项目</h3>
            <p className="text-sm text-gray-500 mb-4">将项目的 JSON 数据粘贴到下方，点击「新建项目」即可导入。</p>
            <textarea
              className="w-full h-48 border border-gray-300 rounded-lg p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder='粘贴 JSON 内容...'
              value={pasteJsonText}
              onChange={(e) => {
                setPasteJsonText(e.target.value);
                setPasteJsonError('');
              }}
              onKeyDown={(e) => e.stopPropagation()}
              onKeyUp={(e) => e.stopPropagation()}
              autoFocus
            />
            {pasteJsonError && (
              <p className="text-sm text-red-500 mt-2">{pasteJsonError}</p>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => {
                  setShowPasteDialog(false);
                  setPasteJsonText('');
                  setPasteJsonError('');
                }}
                className="btn"
              >
                取消
              </button>
              <button
                onClick={handlePasteImport}
                className="btn btn-primary"
                disabled={!pasteJsonText.trim()}
              >
                新建项目
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
