import { create } from 'zustand';
import type { FeishuConfig, PomodoroSettings } from '../types';

interface SettingsState {
  feishu: FeishuConfig;
  pomodoro: PomodoroSettings;
  isConfigured: boolean;
  setFeishu: (config: Partial<FeishuConfig>) => void;
  setPomodoro: (settings: Partial<PomodoroSettings>) => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

const DEFAULT_FEISHU: FeishuConfig = {
  appId: '',
  appSecret: '',
  appToken: '',
  todoTableId: '',
  timeBlockTableId: '',
  noteTableId: '',
  tagTableId: '',
  moodLogTableId: '', // #14: optional
};

const DEFAULT_POMODORO: PomodoroSettings = {
  defaultMinutes: 25,
  breakMinutes: 5,
};

const STORAGE_KEY = 'wtt-settings';

/** Check whether the feishu config is valid enough to operate */
function checkConfigured(feishu: FeishuConfig): boolean {
  const hasRequiredTables = !!(
    feishu.appToken &&
    feishu.todoTableId &&
    feishu.timeBlockTableId &&
    feishu.noteTableId &&
    feishu.tagTableId
  );
  // Either both appId & appSecret are provided, or neither (server-side credentials)
  const hasValidCredentials =
    (!!feishu.appId && !!feishu.appSecret) ||
    (!feishu.appId && !feishu.appSecret);
  return hasRequiredTables && hasValidCredentials;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  feishu: DEFAULT_FEISHU,
  pomodoro: DEFAULT_POMODORO,
  isConfigured: false,

  setFeishu: (config) => {
    set((state) => {
      const feishu = { ...state.feishu, ...config };
      return { feishu, isConfigured: checkConfigured(feishu) };
    });
    get().saveToStorage();
  },

  setPomodoro: (settings) => {
    set((state) => ({
      pomodoro: { ...state.pomodoro, ...settings },
    }));
    get().saveToStorage();
  },

  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const feishu = { ...DEFAULT_FEISHU, ...data.feishu };
        // Ensure all fields are at least empty strings (guard against null from old data)
        for (const key of Object.keys(DEFAULT_FEISHU) as (keyof FeishuConfig)[]) {
          if (feishu[key] == null) {
            feishu[key] = DEFAULT_FEISHU[key];
          }
        }
        const pomodoro = { ...DEFAULT_POMODORO, ...data.pomodoro };
        set({ feishu, pomodoro, isConfigured: checkConfigured(feishu) });
      }
    } catch {
      // ignore
    }
  },

  saveToStorage: () => {
    const { feishu, pomodoro } = get();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ feishu, pomodoro }));
  },
}));
