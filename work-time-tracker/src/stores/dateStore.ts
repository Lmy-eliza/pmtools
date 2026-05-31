import { create } from 'zustand';

interface DateState {
  executionDate: Date;
  setExecutionDate: (d: Date) => void;
}

export const useDateStore = create<DateState>((set) => ({
  executionDate: new Date(),
  setExecutionDate: (d) => set({ executionDate: d }),
}));
