/**
 * 飞书认证状态 Store
 *
 * 管理飞书登录状态、用户信息，与 canvasStore 独立
 */
import { create } from 'zustand';
import {
  isLoggedIn,
  getCurrentUser,
  handleOAuthCallback,
  redirectToFeishuLogin,
  logout as feishuLogout,
  type FeishuUser,
} from '../utils/feishuAuth';

interface AuthState {
  // 状态
  isAuthenticated: boolean;
  user: FeishuUser | null;
  isLoading: boolean;
  error: string | null;

  // 操作
  initialize: () => void;
  login: () => void;
  handleCallback: () => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,

  /**
   * 初始化：检查 localStorage 中是否有有效 token
   */
  initialize: () => {
    if (isLoggedIn()) {
      const user = getCurrentUser();
      set({ isAuthenticated: true, user });
    } else {
      set({ isAuthenticated: false, user: null });
    }
  },

  /**
   * 跳转飞书登录
   */
  login: () => {
    redirectToFeishuLogin();
  },

  /**
   * 处理 OAuth 回调
   */
  handleCallback: async () => {
    set({ isLoading: true, error: null });
    try {
      const tokenInfo = await handleOAuthCallback();
      if (tokenInfo) {
        set({
          isAuthenticated: true,
          user: tokenInfo.user,
          isLoading: false,
        });
        return true;
      } else {
        set({
          isLoading: false,
          error: '登录失败，请重试',
        });
        return false;
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '登录失败',
      });
      return false;
    }
  },

  /**
   * 退出登录
   */
  logout: () => {
    feishuLogout();
    set({ isAuthenticated: false, user: null });
  },

  clearError: () => set({ error: null }),
}));
