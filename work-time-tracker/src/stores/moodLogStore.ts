import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { MoodLog } from '../types';
import { feishuApi } from '../services/feishuApi';
import { useSettingsStore } from './settingsStore';
import { getCurrentTime } from '../utils/timeUtils';
import { ensureDateStr } from '../utils/dateUtils';

interface MoodLogState {
  logs: MoodLog[];
  loading: boolean;
  fetchLogs: (date: string) => Promise<void>;
  fetchLogsRange: (startDate: string, endDate: string) => Promise<MoodLog[]>;
  addLog: (date: string, emoji: string, score: number) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
}

export const useMoodLogStore = create<MoodLogState>((set, get) => ({
  logs: [],
  loading: false,

  fetchLogs: async (date: string) => {
    const { feishu } = useSettingsStore.getState();
    if (!feishu.moodLogTableId) {
      set({ logs: [], loading: false });
      return;
    }
    set({ loading: true });
    try {
      // 全量拉取后前端过滤（moodLog 数据量小，规避飞书 filter 时间戳匹配问题）
      const allLogs = await feishuApi.listRecords<MoodLog>('moodLog');
      const dayLogs = allLogs.filter(l => ensureDateStr(l.date) === date);
      console.log('[MoodLog] fetchLogs:', { date, total: allLogs.length, matched: dayLogs.length });
      if (allLogs.length > 0 && dayLogs.length === 0) {
        // 诊断：打印前3条原始 date 值，帮助定位格式不匹配问题
        console.log('[MoodLog] 样本数据 date 字段:', allLogs.slice(0, 3).map(l => ({ raw: l.date, parsed: ensureDateStr(l.date) })));
      }
      set({ logs: dayLogs, loading: false });
    } catch (e) {
      console.error('[MoodLog] fetchLogs 失败:', e);
      set({ logs: [], loading: false });
    }
  },

  fetchLogsRange: async (startDate: string, endDate: string) => {
    const { feishu } = useSettingsStore.getState();
    if (!feishu.moodLogTableId) return [];
    try {
      const allLogs = await feishuApi.listRecords<MoodLog>('moodLog');
      return allLogs.filter(l => {
        const d = ensureDateStr(l.date);
        return d >= startDate && d <= endDate;
      });
    } catch {
      return [];
    }
  },

  addLog: async (date: string, emoji: string, score: number) => {
    const { feishu } = useSettingsStore.getState();
    if (!feishu.moodLogTableId) {
      // Fallback: no moodLog table configured, skip
      return;
    }

    const log: MoodLog = {
      id: uuidv4(),
      date,
      emoji,
      score,
      time: getCurrentTime(),
      created_at: new Date().toISOString(),
    };

    try {
      await feishuApi.createRecord('moodLog', log);
      set((state) => ({ logs: [...state.logs, log] }));
    } catch (e) {
      throw e instanceof Error ? e : new Error('添加心情记录失败');
    }
  },

  deleteLog: async (id: string) => {
    const log = get().logs.find(l => l.id === id);
    if (!log) return;
    try {
      await feishuApi.deleteRecord('moodLog', log._recordId);
      set((state) => ({ logs: state.logs.filter(l => l.id !== id) }));
    } catch (e) {
      throw e instanceof Error ? e : new Error('删除心情记录失败');
    }
  },
}));
