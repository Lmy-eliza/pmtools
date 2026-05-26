/**
 * 飞书 OAuth 登录工具
 *
 * 流程：
 * 1. 前端跳转飞书授权页
 * 2. 用户授权后飞书回调带 code
 * 3. 前端把 code 发给 Netlify Function（安全中转）
 * 4. Netlify Function 用 AppSecret 换取 user_access_token
 * 5. 前端存储 token 到 localStorage
 */

// 飞书用户信息
export interface FeishuUser {
  openId: string;
  unionId: string;
  name: string;
  avatarUrl: string;
}

// Token 存储结构
export interface FeishuTokenInfo {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;      // 过期时间戳（ms）
  refreshExpiresAt: number;
  user: FeishuUser;
}

const STORAGE_KEY = 'feishu_token_info';
const APP_ID = import.meta.env.VITE_FEISHU_APP_ID;

// 获取 Netlify Function 的基础 URL
function getApiBaseUrl(): string {
  // 线上环境直接用相对路径
  if (import.meta.env.PROD) {
    return '/.netlify/functions';
  }
  // 开发环境：先尝试 Netlify Dev（8888），否则用 Vite proxy
  return '/.netlify/functions';
}

/**
 * 构造飞书 OAuth 授权 URL 并跳转
 */
export function redirectToFeishuLogin(): void {
  const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
  const state = Math.random().toString(36).substring(2, 15);
  sessionStorage.setItem('feishu_oauth_state', state);

  const authUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${APP_ID}&redirect_uri=${redirectUri}&state=${state}`;
  window.location.href = authUrl;
}

/**
 * 处理 OAuth 回调：从 URL 提取 code，换取 token
 */
export async function handleOAuthCallback(): Promise<FeishuTokenInfo | null> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');

  if (!code) {
    console.error('OAuth 回调缺少 code');
    return null;
  }

  // 验证 state（防 CSRF）
  const savedState = sessionStorage.getItem('feishu_oauth_state');
  if (state && savedState && state !== savedState) {
    console.error('OAuth state 不匹配');
    return null;
  }
  sessionStorage.removeItem('feishu_oauth_state');

  try {
    // 通过 Netlify Function 安全换取 token
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/feishu-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('换取 token 失败:', err);
      return null;
    }

    const data = await res.json();

    const tokenInfo: FeishuTokenInfo = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      refreshExpiresAt: Date.now() + (data.refresh_expires_in || 2592000) * 1000,
      user: {
        openId: data.open_id,
        unionId: data.union_id,
        name: data.name,
        avatarUrl: data.avatar_url,
      },
    };

    // 存储到 localStorage
    saveTokenInfo(tokenInfo);

    return tokenInfo;
  } catch (error) {
    console.error('OAuth 回调处理失败:', error);
    return null;
  }
}

/**
 * 刷新 token（在过期前 5 分钟自动触发）
 */
export async function refreshAccessToken(): Promise<boolean> {
  const tokenInfo = getTokenInfo();
  if (!tokenInfo?.refreshToken) return false;

  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/feishu-refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokenInfo.refreshToken }),
    });

    if (!res.ok) {
      console.error('刷新 token 失败');
      return false;
    }

    const data = await res.json();

    const newTokenInfo: FeishuTokenInfo = {
      ...tokenInfo,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      refreshExpiresAt: Date.now() + (data.refresh_expires_in || 2592000) * 1000,
    };

    saveTokenInfo(newTokenInfo);
    return true;
  } catch (error) {
    console.error('刷新 token 异常:', error);
    return false;
  }
}

/**
 * 获取有效的 access_token（自动刷新如果快过期）
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokenInfo = getTokenInfo();
  if (!tokenInfo) return null;

  // 距离过期不到 5 分钟，自动刷新
  if (tokenInfo.expiresAt - Date.now() < 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      // refresh_token 也过期了，需要重新登录
      logout();
      return null;
    }
    return getTokenInfo()?.accessToken || null;
  }

  return tokenInfo.accessToken;
}

/**
 * 获取当前登录的飞书用户信息
 */
export function getCurrentUser(): FeishuUser | null {
  const tokenInfo = getTokenInfo();
  return tokenInfo?.user || null;
}

/**
 * 判断是否已登录
 */
export function isLoggedIn(): boolean {
  const tokenInfo = getTokenInfo();
  if (!tokenInfo) return false;
  // refresh_token 还没过期就算登录态
  return tokenInfo.refreshExpiresAt > Date.now();
}

/**
 * 退出登录
 */
export function logout(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ===== 内部辅助函数 =====

function saveTokenInfo(info: FeishuTokenInfo): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
}

function getTokenInfo(): FeishuTokenInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
