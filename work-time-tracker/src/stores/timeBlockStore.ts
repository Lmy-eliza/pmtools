import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { TimeBlock } from '../types';
import { feishuApi } from '../services/feishuApi';
import { dateToTimestamp, dateToTimestampRange } from '../utils/dateUtils';
import { calcDuration } from '../utils/timeUtils';

interface TimeBlockState {
  blocks: TimeBlock[];
  loading: boolean;
  fetchBlocks: (date: string) => Promise<void>;
  fetchBlocksRange: (startDate: string, endDate: string) => Promise<TimeBlock[]>;
  addBlock: (data: Omit<TimeBlock, 'id' | 'duration_minutes'>) => Promise<TimeBlock>;
  updateBlock: (id: string, data: Partial<TimeBlock>) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
}

export const useTimeBlockStore = create<TimeBlockState>((set, get) => ({
  blocks: [],
  loading: false,

  fetchBlocks: async (date) => {
    set({ loading: true });
    try {
      const { startTs, endTs } = dateToTimestampRange(date);
      const blocks = await feishuApi.listRecords<TimeBlock>('timeBlock', {
        filter: `CurrentValue.[date] >= ${startTs} && CurrentValue.[date] < ${endTs}`,
      });
      set({ blocks, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchBlocksRange: async (startDate, endDate) => {
    try {
      const blocks = await feishuApi.listRecords<TimeBlock>('timeBlock', {
        filter: `CurrentValue.[date] >= ${dateToTimestamp(startDate)} && CurrentValue.[date] < ${dateToTimestampRange(endDate).endTs}`,
      });
      return blocks;
    } catch {
      return [];
    }
  },

  addBlock: async (data) => {
    const duration_minutes = Math.max(1, calcDuration(data.start_time, data.end_time));
    const block: TimeBlock = {
      ...data,
      id: uuidv4(),
      duration_minutes,
    };
    try {
      await feishuApi.createRecord('timeBlock', block);
      set((state) => ({ blocks: [...state.blocks, block] }));
      return block;
    } catch (e) {
      throw e instanceof Error ? e : new Error('添加时间块失败');
    }
  },

  updateBlock: async (id, data) => {
    const block = get().blocks.find((b) => b.id === id);
    if (!block) return;
    const updated = { ...block, ...data };
    if (data.start_time || data.end_time) {
      updated.duration_minutes = calcDuration(
        updated.start_time,
        updated.end_time
      );
    }
    try {
      await feishuApi.updateRecord('timeBlock', block._recordId, updated);
      set((state) => ({
        blocks: state.blocks.map((b) => (b.id === id ? updated : b)),
      }));
    } catch (e) {
      throw e instanceof Error ? e : new Error('更新时间块失败');
    }
  },

  deleteBlock: async (id) => {
    const block = get().blocks.find((b) => b.id === id);
    if (!block) return;
    try {
      await feishuApi.deleteRecord('timeBlock', block._recordId);
      set((state) => ({ blocks: state.blocks.filter((b) => b.id !== id) }));
    } catch (e) {
      throw e instanceof Error ? e : new Error('删除时间块失败');
    }
  },
}));
