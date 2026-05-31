import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Tag } from '../types';
import { PRESET_TAGS } from '../types';
import { feishuApi } from '../services/feishuApi';

interface TagState {
  tags: Tag[];
  loading: boolean;
  fetchTags: () => Promise<void>;
  addTag: (tag: Omit<Tag, 'id' | 'created_at'>) => Promise<Tag>;
  updateTag: (id: string, data: Partial<Tag>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  ensurePresets: () => Promise<void>;
  getTagById: (id: string) => Tag | undefined;
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  loading: false,

  fetchTags: async () => {
    set({ loading: true });
    try {
      const tags = await feishuApi.listRecords<Tag>('tag');
      set({ tags, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addTag: async (data) => {
    const tag: Tag = {
      ...data,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };
    try {
      await feishuApi.createRecord('tag', tag);
      set((state) => ({ tags: [...state.tags, tag] }));
      return tag;
    } catch (e) {
      throw e instanceof Error ? e : new Error('添加标签失败');
    }
  },

  updateTag: async (id, data) => {
    const tag = get().tags.find((t) => t.id === id);
    if (!tag) return;
    const updated = { ...tag, ...data };
    try {
      await feishuApi.updateRecord('tag', tag._recordId, updated);
      set((state) => ({
        tags: state.tags.map((t) => (t.id === id ? { ...t, ...data } : t)),
      }));
    } catch (e) {
      throw e instanceof Error ? e : new Error('更新标签失败');
    }
  },

  deleteTag: async (id) => {
    const tag = get().tags.find((t) => t.id === id);
    if (!tag) return;
    try {
      await feishuApi.deleteRecord('tag', tag._recordId);
      set((state) => ({ tags: state.tags.filter((t) => t.id !== id) }));
    } catch (e) {
      throw e instanceof Error ? e : new Error('删除标签失败');
    }
  },

  ensurePresets: async () => {
    const existing = get().tags;
    if (existing.length > 0) return;

    const errors: string[] = [];
    for (const preset of PRESET_TAGS) {
      const tag: Tag = {
        ...preset,
        id: uuidv4(),
        created_at: new Date().toISOString(),
      };
      try {
        await feishuApi.createRecord('tag', tag);
        set((state) => ({ tags: [...state.tags, tag] }));
      } catch (e) {
        errors.push(preset.name);
      }
    }
    if (errors.length > 0) {
      throw new Error(`以下预设标签创建失败: ${errors.join(', ')}`);
    }
  },

  getTagById: (id) => get().tags.find((t) => t.id === id),
}));
