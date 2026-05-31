import { create } from 'zustand';

type PomodoroPhase = 'idle' | 'focus' | 'break';

interface PomodoroState {
  phase: PomodoroPhase;
  totalSeconds: number;
  remainingSeconds: number;
  todoId: string | null;
  intervalId: number | null;
  isExpanded: boolean;
  isOvertime: boolean;
  overtimeSeconds: number;
  focusStartedAt: Date | null;
  startFocus: (minutes: number, todoId: string | null) => void;
  startBreak: (minutes: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => { todoId: string | null; seconds: number } | null;
  tick: () => void;
  setExpanded: (v: boolean) => void;
  toggleExpanded: () => void;
  setTodoId: (id: string | null) => void;
  continueAsTimer: () => void;
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  phase: 'idle',
  totalSeconds: 0,
  remainingSeconds: 0,
  todoId: null,
  intervalId: null,
  isExpanded: false,
  isOvertime: false,
  overtimeSeconds: 0,
  focusStartedAt: null,

  startFocus: (minutes, todoId) => {
    const state = get();
    if (state.intervalId) window.clearInterval(state.intervalId);
    const totalSec = minutes * 60;
    const id = window.setInterval(() => get().tick(), 1000);
    set({
      phase: 'focus',
      totalSeconds: totalSec,
      remainingSeconds: totalSec,
      todoId,
      intervalId: id,
      isOvertime: false,
      overtimeSeconds: 0,
      focusStartedAt: new Date(),
    });
  },

  startBreak: (minutes) => {
    const state = get();
    if (state.intervalId) window.clearInterval(state.intervalId);
    const totalSec = minutes * 60;
    const id = window.setInterval(() => get().tick(), 1000);
    set({
      phase: 'break',
      totalSeconds: totalSec,
      remainingSeconds: totalSec,
      intervalId: id,
      focusStartedAt: null,
    });
  },

  pause: () => {
    const state = get();
    if (state.intervalId) {
      window.clearInterval(state.intervalId);
      set({ intervalId: null });
    }
  },

  resume: () => {
    const state = get();
    if (state.phase !== 'idle' && !state.intervalId) {
      const id = window.setInterval(() => get().tick(), 1000);
      set({ intervalId: id });
    }
  },

  stop: () => {
    const state = get();
    if (state.intervalId) window.clearInterval(state.intervalId);
    // 计算已用时长：倒计时消耗 + 加时部分
    const elapsed = state.isOvertime
      ? state.totalSeconds + state.overtimeSeconds
      : state.totalSeconds - state.remainingSeconds;
    const result =
      state.phase === 'focus'
        ? { todoId: state.todoId, seconds: elapsed }
        : null;
    set({
      phase: 'idle',
      totalSeconds: 0,
      remainingSeconds: 0,
      todoId: null,
      intervalId: null,
      isOvertime: false,
      overtimeSeconds: 0,
      focusStartedAt: null,
    });
    return result;
  },

  tick: () => {
    const state = get();
    // 加时模式：递增 overtimeSeconds
    if (state.isOvertime) {
      set({ overtimeSeconds: state.overtimeSeconds + 1 });
      return;
    }
    if (state.remainingSeconds <= 1) {
      if (state.intervalId) window.clearInterval(state.intervalId);
      // 阶段完成
      if (state.phase === 'focus') {
        // 播放提示音
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 800;
          gain.gain.value = 0.3;
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        } catch {
          // ignore
        }
      }
      set({ remainingSeconds: 0, intervalId: null });
      return;
    }
    set({ remainingSeconds: state.remainingSeconds - 1 });
  },

  setExpanded: (v) => set({ isExpanded: v }),
  toggleExpanded: () => set((s) => ({ isExpanded: !s.isExpanded })),
  setTodoId: (id) => set({ todoId: id }),
  // 倒计时归零后转为正计时模式
  continueAsTimer: () => {
    const state = get();
    if (state.intervalId) window.clearInterval(state.intervalId);
    const id = window.setInterval(() => get().tick(), 1000);
    set({ isOvertime: true, overtimeSeconds: 0, intervalId: id });
  },
}));
