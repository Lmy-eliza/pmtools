import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { sendChatMessage, type ChatMessage } from '../api/chatApi';
import { useCanvasStore } from './canvasStore';
import { exportToJSON } from '../utils/storage';
import type { ProjectData } from '../types';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,

  sendMessage: async (content: string) => {
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    const previousMessages = get().messages;

    set(state => ({
      messages: [...state.messages, userMsg],
      isLoading: true,
    }));

    try {
      const { projectName, startDate, endDate, swimlanes, nodes, connections, constraints } = useCanvasStore.getState();
      let currentProjectData: string | undefined;
      if (nodes.length > 0) {
        const projectData: ProjectData = {
          id: uuidv4(),
          name: projectName,
          startDate, endDate, swimlanes, nodes, connections, constraints,
          createdAt: new Date(), updatedAt: new Date(),
        };
        currentProjectData = exportToJSON(projectData);
      }

      const response = await sendChatMessage(content, previousMessages, currentProjectData);

      const aiMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response.reply,
        timestamp: new Date(),
        projectData: response.projectData,
      };

      set(state => ({
        messages: [...state.messages, aiMsg],
        isLoading: false,
      }));
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `请求失败：${err instanceof Error ? err.message : '未知错误'}`,
        timestamp: new Date(),
      };

      set(state => ({
        messages: [...state.messages, errorMsg],
        isLoading: false,
      }));
    }
  },

  clearMessages: () => set({ messages: [] }),
}));
