/**
 * 飞书云端同步 Hook
 *
 * 功能：
 * 1. 每 10 秒轮询 updatedAt 字段
 * 2. 检测到他人修改时弹窗提示
 * 3. 显示"最后由 XX 编辑于 HH:mm"
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { getProjectUpdatedAt, getProject } from '../utils/feishuApi';
import { useAuthStore } from '../stores/authStore';
import { useCanvasStore } from '../stores/canvasStore';

interface SyncState {
  lastSyncAt: Date | null;         // 上次同步时间
  remoteUpdatedAt: Date | null;    // 远端最后更新时间
  hasConflict: boolean;            // 是否检测到冲突
  conflictMessage: string | null;  // 冲突提示信息
}

interface UseSyncOptions {
  recordId: string | undefined;
  enabled: boolean;                // 是否启用同步
  pollingInterval?: number;        // 轮询间隔（ms），默认 10000
}

export function useCloudSync({ recordId, enabled, pollingInterval = 10000 }: UseSyncOptions) {
  const [syncState, setSyncState] = useState<SyncState>({
    lastSyncAt: null,
    remoteUpdatedAt: null,
    hasConflict: false,
    conflictMessage: null,
  });

  const lastKnownUpdatedAt = useRef<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { isAuthenticated } = useAuthStore();

  /**
   * 检查远端更新
   */
  const checkForUpdates = useCallback(async () => {
    if (!recordId || !isAuthenticated) return;

    try {
      const remoteUpdatedAt = await getProjectUpdatedAt(recordId);
      if (!remoteUpdatedAt) return;

      setSyncState((prev) => ({
        ...prev,
        remoteUpdatedAt,
        lastSyncAt: new Date(),
      }));

      // 对比上次已知的更新时间
      if (lastKnownUpdatedAt.current) {
        const timeDiff = remoteUpdatedAt.getTime() - lastKnownUpdatedAt.current.getTime();
        if (timeDiff > 2000) {
          // 远端有新的修改（大于 2 秒差距，排除自己刚保存的情况）
          setSyncState((prev) => ({
            ...prev,
            hasConflict: true,
            conflictMessage: `项目在 ${remoteUpdatedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 被其他人更新了`,
          }));
        }
      }

      lastKnownUpdatedAt.current = remoteUpdatedAt;
    } catch (error) {
      console.warn('同步检查失败:', error);
    }
  }, [recordId, isAuthenticated]);

  /**
   * 加载远端最新数据
   */
  const loadLatestVersion = useCallback(async (): Promise<boolean> => {
    if (!recordId) return false;

    try {
      const result = await getProject(recordId);
      if (!result) return false;

      const { projectData } = result;

      // 更新 store
      useCanvasStore.setState({
        projectName: projectData.name,
        startDate: projectData.startDate,
        endDate: projectData.endDate,
        swimlanes: projectData.swimlanes,
        nodes: projectData.nodes,
        connections: projectData.connections,
        constraints: projectData.constraints,
        selectedNodeIds: [],
        history: [],
        historyIndex: -1,
      });

      // 更新已知时间
      lastKnownUpdatedAt.current = new Date();

      setSyncState((prev) => ({
        ...prev,
        hasConflict: false,
        conflictMessage: null,
        lastSyncAt: new Date(),
      }));

      return true;
    } catch (error) {
      console.error('加载最新版本失败:', error);
      return false;
    }
  }, [recordId]);

  /**
   * 忽略冲突（保持本地版本）
   */
  const dismissConflict = useCallback(() => {
    lastKnownUpdatedAt.current = new Date();
    setSyncState((prev) => ({
      ...prev,
      hasConflict: false,
      conflictMessage: null,
    }));
  }, []);

  /**
   * 更新已知的远端时间（本地保存成功后调用）
   */
  const markSynced = useCallback(() => {
    lastKnownUpdatedAt.current = new Date();
  }, []);

  // 启动/停止轮询
  useEffect(() => {
    if (enabled && recordId && isAuthenticated) {
      // 立即检查一次
      checkForUpdates();

      // 定时轮询
      timerRef.current = setInterval(checkForUpdates, pollingInterval);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, recordId, isAuthenticated, pollingInterval, checkForUpdates]);

  return {
    ...syncState,
    loadLatestVersion,
    dismissConflict,
    markSynced,
  };
}
