import { useEffect } from 'react';

interface KeyboardActions {
  onNewTodo?: () => void;        // N
  onToggleTimer?: () => void;     // Space
  onFocusFilter?: () => void;     // /
  onToday?: () => void;           // T
  onPrevDay?: () => void;         // ←
  onNextDay?: () => void;         // →
  onSwitchTab?: (tab: number) => void; // 1,2,3
}

export function useKeyboard(actions: KeyboardActions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea/select
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case 'n':
        case 'N':
          e.preventDefault();
          actions.onNewTodo?.();
          break;
        case ' ':
          e.preventDefault();
          actions.onToggleTimer?.();
          break;
        case '/':
          e.preventDefault();
          actions.onFocusFilter?.();
          break;
        case 't':
        case 'T':
          e.preventDefault();
          actions.onToday?.();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          actions.onPrevDay?.();
          break;
        case 'ArrowRight':
          e.preventDefault();
          actions.onNextDay?.();
          break;
        case '1':
          e.preventDefault();
          actions.onSwitchTab?.(0);
          break;
        case '2':
          e.preventDefault();
          actions.onSwitchTab?.(1);
          break;
        case '3':
          e.preventDefault();
          actions.onSwitchTab?.(2);
          break;
        case '?':
          e.preventDefault();
          // Show help - toggle a modal or tooltip
          const existing = document.getElementById('keyboard-help');
          if (existing) {
            existing.remove();
          } else {
            const help = document.createElement('div');
            help.id = 'keyboard-help';
            help.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/30';
            help.onclick = () => help.remove();
            help.innerHTML = `
              <div class="bg-white rounded-2xl shadow-2xl p-6 max-w-sm" onclick="event.stopPropagation()">
                <h3 class="font-semibold text-gray-800 mb-3">⌨️ 快捷键</h3>
                <div class="space-y-2 text-sm text-gray-600">
                  <div class="flex justify-between"><span>N</span><span>新建待办</span></div>
                  <div class="flex justify-between"><span>T</span><span>跳回今日</span></div>
                  <div class="flex justify-between"><span>← →</span><span>切换日期</span></div>
                  <div class="flex justify-between"><span>1 2 3</span><span>切换标签页</span></div>
                  <div class="flex justify-between"><span>/</span><span>聚焦搜索</span></div>
                  <div class="flex justify-between"><span>?</span><span>显示快捷键</span></div>
                </div>
                <div class="mt-4 text-xs text-gray-400 text-center">按任意键或点击空白处关闭</div>
              </div>
            `;
            document.body.appendChild(help);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
}
