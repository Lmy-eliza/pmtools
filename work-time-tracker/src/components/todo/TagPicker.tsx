import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Tag } from '../../types';
import { useTagStore } from '../../stores/tagStore';
import { ChevronDown, Pencil, Check, X } from 'lucide-react';

interface Props {
  value: string; // tag_id
  onChange: (tag: Tag) => void;
}

export default function TagPicker({ value, onChange }: Props) {
  const { tags, updateTag } = useTagStore();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 下拉定位状态
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // #22a: inline tag editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editColor, setEditColor] = useState('');

  const selected = tags.find((t) => t.id === value);

  // 计算下拉位置：基于触发按钮的 getBoundingClientRect
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = 200; // max-h-48 ≈ 192px，预留一点

    if (spaceBelow >= dropdownHeight) {
      // 向下弹出
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    } else {
      // 向上弹出
      setDropdownStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, []);

  // 打开时计算位置，并监听滚动/resize
  useEffect(() => {
    if (!open) return;
    updatePosition();

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  // 点击外部关闭
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
        setEditingId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const startEdit = (tag: Tag, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditEmoji(tag.emoji);
    setEditColor(tag.color);
  };

  const saveEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingId || !editName.trim()) return;
    try {
      await updateTag(editingId, { name: editName.trim(), emoji: editEmoji, color: editColor });
    } catch (err) {
      console.error('更新标签失败:', err);
    }
    setEditingId(null);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  // 下拉内容
  const dropdownContent = open ? (
    <div
      ref={dropdownRef}
      className="bg-white rounded-xl shadow-xl border border-gray-200 py-1 max-h-48 overflow-y-auto"
      style={dropdownStyle}
    >
      {tags.map((tag) => (
        <div key={tag.id}>
          {editingId === tag.id ? (
            /* #22a: inline edit row */
            <div className="flex items-center gap-1 px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editEmoji}
                onChange={(e) => setEditEmoji(e.target.value)}
                className="w-8 px-1 py-0.5 rounded border border-gray-200 text-center text-sm"
              />
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-1 py-0.5 rounded border border-gray-200 text-sm min-w-0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit(e as unknown as React.MouseEvent);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                autoFocus
              />
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="w-6 h-6 rounded border border-gray-200 cursor-pointer p-0"
              />
              <button onClick={saveEdit} className="p-0.5 rounded hover:bg-green-50">
                <Check size={12} className="text-green-500" />
              </button>
              <button onClick={cancelEdit} className="p-0.5 rounded hover:bg-red-50">
                <X size={12} className="text-red-400" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onChange(tag);
                setOpen(false);
              }}
              className={`group/tag flex items-center gap-2 px-3 py-2 w-full hover:bg-gray-50 transition-colors text-sm ${
                tag.id === value ? 'bg-blue-50' : ''
              }`}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <span>{tag.emoji}</span>
              <span className="flex-1 text-left">{tag.name}</span>
              {/* #22a: hover edit icon */}
              <span
                onClick={(e) => startEdit(tag, e)}
                className="p-0.5 rounded opacity-0 group-hover/tag:opacity-60 hover:!opacity-100 hover:bg-gray-100 transition-all"
              >
                <Pencil size={12} className="text-gray-400" />
              </span>
            </button>
          )}
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 bg-white/80 hover:bg-gray-50 transition-colors text-sm w-full"
      >
        {selected ? (
          <>
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: selected.color }}
            />
            <span>
              {selected.emoji} {selected.name}
            </span>
          </>
        ) : (
          <span className="text-gray-400">选择标签...</span>
        )}
        <ChevronDown size={14} className="ml-auto text-gray-400" />
      </button>

      {/* Portal 渲染下拉到 body，避免被父容器 overflow 裁切 */}
      {dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}
