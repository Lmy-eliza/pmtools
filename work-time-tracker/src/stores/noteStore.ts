import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { DailyNote } from '../types';
import { feishuApi } from '../services/feishuApi';
import { dateToTimestamp, dateToTimestampRange, ensureDateStr } from '../utils/dateUtils';

interface NoteState {
  notes: DailyNote[];        // 当天所有随笔
  loading: boolean;
  fetchNotes: (date: string) => Promise<void>;
  fetchNotesRange: (startDate: string, endDate: string) => Promise<DailyNote[]>;
  createNote: (date: string, content: string) => Promise<void>;
  updateNote: (recordId: string, content: string) => Promise<void>;
  deleteNote: (recordId: string) => Promise<void>;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  loading: false,

  fetchNotes: async (date) => {
    set({ loading: true });
    try {
      const { startTs, endTs } = dateToTimestampRange(date);
      const result = await feishuApi.listRecords<DailyNote>('note', {
        filter: `CurrentValue.[date] >= ${startTs} && CurrentValue.[date] < ${endTs}`,
      });
      // 按 created_at 降序排列（最新的在前）
      const sorted = result.sort((a, b) => {
        const ta = a.created_at || '';
        const tb = b.created_at || '';
        return tb.localeCompare(ta);
      });
      set({ notes: sorted, loading: false });
    } catch {
      set({ notes: [], loading: false });
    }
  },

  fetchNotesRange: async (startDate, endDate) => {
    try {
      const notes = await feishuApi.listRecords<DailyNote>('note', {
        filter: `CurrentValue.[date] >= ${dateToTimestamp(startDate)} && CurrentValue.[date] < ${dateToTimestampRange(endDate).endTs}`,
      });
      return notes;
    } catch {
      return [];
    }
  },

  createNote: async (date, content) => {
    const note: DailyNote = {
      id: uuidv4(),
      date,
      content,
      created_at: new Date().toISOString(),
    };
    try {
      await feishuApi.createRecord('note', note);
      // 添加到列表最前面
      set((state) => ({ notes: [note, ...state.notes] }));
    } catch (e) {
      throw e instanceof Error ? e : new Error('保存随笔失败');
    }
  },

  updateNote: async (recordId, content) => {
    try {
      await feishuApi.updateRecord('note', recordId, { content });
      set((state) => ({
        notes: state.notes.map((n) =>
          n._recordId === recordId ? { ...n, content } : n
        ),
      }));
    } catch (e) {
      throw e instanceof Error ? e : new Error('更新随笔失败');
    }
  },

  deleteNote: async (recordId) => {
    await feishuApi.deleteRecord('note', recordId);
    set((state) => ({
      notes: state.notes.filter((n) => n._recordId !== recordId),
    }));
  },
}));
