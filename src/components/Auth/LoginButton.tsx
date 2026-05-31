/**
 * 飞书登录按钮组件
 *
 * 未登录：显示"飞书登录"按钮
 * 已登录：显示用户头像 + 姓名 + 下拉菜单（退出）
 */
import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { LogOut, User, ChevronDown } from 'lucide-react';

export const LoginButton: React.FC = () => {
  const { isAuthenticated, user, isLoading, login, logout } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        <span>登录中...</span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <button
        onClick={login}
        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
        title="登录"
      >
        <User size={18} />
      </button>
    );
  }

  // 已登录状态
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1.5 px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
        )}
        <span className="max-w-[80px] truncate">{user.name}</span>
        <ChevronDown size={12} className={`transition-transform ${showMenu ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉菜单 */}
      {showMenu && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
            <div className="text-xs text-gray-500 truncate">{user.openId}</div>
          </div>
          <button
            onClick={() => {
              logout();
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={14} />
            <span>退出登录</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginButton;
