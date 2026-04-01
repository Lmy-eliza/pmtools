import { create } from 'zustand';

interface TimerState {
  isRunning: boolean;
  seconds: number;
  todoId: string | null;
  startedAt: Date | null;
  intervalId: number | null;
  start: (todoId: string) => void;
  stop: () => { todoId: string; seconds: number; startedAt: Date } | null;
  pause: () => void;
  resume: () => void;
  setTodoId: (id: string | null) => void;
  tick: () => void;
  reset: () => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  isRunning: false,
  seconds: 0,
  todoId: null,
  startedAt: null,
  intervalId: null,

  start: (todoId) => {
    const state = get();
    if (state.intervalId) {
      window.clearInterval(state.intervalId);
    }
    const id = window.setInterval(() => get().tick(), 1000);
    set({
      isRunning: true,
      seconds: 0,
      todoId,
      startedAt: new Date(),
      intervalId: id,
    });
  },

  stop: () => {
    const state = get();
    if (state.intervalId) {
      window.clearInterval(state.intervalId);
    }
    if (!state.todoId || !state.startedAt) {
      set({ isRunning: false, intervalId: null });
      return null;
    }
    const result = {
      todoId: state.todoId,
      seconds: state.seconds,
      startedAt: state.startedAt,
    };
    set({
      isRunning: false,
      seconds: 0,
      todoId: null,
      startedAt: null,
      intervalId: null,
    });
    return result;
  },

  // 暂停：保持 isRunning=true，清除 interval
  pause: () => {
    const state = get();
    if (state.intervalId) {
      window.clearInterval(state.intervalId);
      set({ intervalId: null });
    }
  },

  // 恢复：重新启动 interval
  resume: () => {
    const state = get();
    if (state.isRunning && !state.intervalId) {
      const id = window.setInterval(() => get().tick(), 1000);
      set({ intervalId: id });
    }
  },

  // 计时中切换待办
  setTodoId: (id) => set({ todoId: id }),

  tick: () => {
    set((state) => ({ seconds: state.seconds + 1 }));
  },

  reset: () => {
    const state = get();
    if (state.intervalId) {
      window.clearInterval(state.intervalId);
    }
    set({
      isRunning: false,
      seconds: 0,
      todoId: null,
      startedAt: null,
      intervalId: null,
    });
  },
}));
