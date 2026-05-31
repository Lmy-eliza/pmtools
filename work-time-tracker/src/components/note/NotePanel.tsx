import { useEffect, useState, useCallback, useRef } from 'react';
import { useNoteStore } from '../../stores/noteStore';
import { formatDate } from '../../utils/dateUtils';
import { subDays } from 'date-fns';
import { Trash2, Pencil, X } from 'lucide-react';
import ConfirmDialog from '../ui/ConfirmDialog';
import type { DailyNote } from '../../types';

interface Props {
  date: string;
}

export default function NotePanel({ date }: Props) {
  const { notes, fetchNotes, createNote, updateNote, fetchNotesRange, deleteNote } = useNoteStore();
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // 编辑中的随笔（null = 新增模式）
  const [editingNote, setEditingNote] = useState<DailyNote | null>(null);

  // 最近随笔（最近30天，排除今天，取3条）
  const [recentNotes, setRecentNotes] = useState<DailyNote[]>([]);
  const [pendingDeleteNote, setPendingDeleteNote] = useState<DailyNote | null>(null);

  // 保存流程期间持续为 true，阻止误操作
  const isSavingRef = useRef(false);

  // 加载当天随笔
  useEffect(() => {
    fetchNotes(date);
    // 切换日期时退出编辑模式
    setEditingNote(null);
    setContent('');
  }, [date, fetchNotes]);

  // 加载最近随笔
  useEffect(() => {
    const yesterday = formatDate(subDays(new Date(date), 1));
    const start = formatDate(subDays(new Date(date), 30));
    fetchNotesRange(start, yesterday).then((result) => {
      const filtered = result
        .filter((n) => n.content)
        .sort((a, b) => (a.date > b.date ? -1 : 1))
        .slice(0, 3);
      setRecentNotes(filtered);
    });
  }, [date, fetchNotesRange]);

  // 进入编辑模式
  const startEdit = (note: DailyNote) => {
    setEditingNote(note);
    setContent(note.content || '');
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingNote(null);
    setContent('');
  };

  const handleSave = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    // 编辑模式：内容未变则跳过
    if (editingNote && trimmed === (editingNote.content || '').trim()) return;

    isSavingRef.current = true;
    setSaving(true);
    setError('');
    try {
      if (editingNote && editingNote._recordId) {
        // 编辑模式：更新已有记录
        await updateNote(editingNote._recordId, trimmed);
      } else {
        // 新增模式：创建新记录
        await createNote(date, trimmed);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      // 保存成功后清空并退出编辑模式
      setEditingNote(null);
      setContent('');
      // 刷新当天随笔
      await fetchNotes(date);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  }, [date, content, editingNote, createNote, updateNote, fetchNotes]);

  // Ctrl+Enter / Cmd+Enter 快捷键保存
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const handleDeleteNote = async (noteToDelete: DailyNote) => {
    if (!noteToDelete._recordId) return;
    try {
      await deleteNote(noteToDelete._recordId);
      // 如果正在编辑这条，退出编辑模式
      if (editingNote?.id === noteToDelete.id) {
        setEditingNote(null);
        setContent('');
      }
      // 刷新当天随笔
      await fetchNotes(date);
      // 刷新最近随笔列表
      setRecentNotes((prev) => prev.filter((n) => n.id !== noteToDelete.id));
    } catch {
      // silent fail
    }
  };

  const truncate = (text: string, maxLen = 40) =>
    text.length > maxLen ? text.slice(0, maxLen) + '...' : text;

  // 格式化时间显示（从 created_at 提取）
  const formatTime = (note: DailyNote) => {
    if (!note.created_at) return '';
    try {
      const d = new Date(note.created_at);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* 编辑提示 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-600">
            {editingNote
              ? `✏️ 编辑随笔（${editingNote.date.slice(5)} ${formatTime(editingNote)}）`
              : '随笔'}
          </div>
          {editingNote && (
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={12} /> 取消编辑
            </button>
          )}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="记录今天的想法... (Ctrl+Enter 保存)"
          rows={6}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm resize-none"
        />
      </div>

      {/* Feedback */}
      {error && (
        <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          ❌ {error}
        </div>
      )}
      {saved && (
        <div className="px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-green-600 text-sm">
          ✅ 已保存
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving || !content.trim()}
        className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-400 text-white text-sm font-medium hover:shadow-md transition-all disabled:opacity-50"
      >
        {saving ? '保存中...' : editingNote ? '💾 更新' : '💾 保存'}
      </button>

      {/* 今日随笔列表 */}
      {notes.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-gray-400 mb-2">📝 今日随笔（{notes.length}条）</div>
          <div className="space-y-1.5">
            {notes.map((n) => (
              <div
                key={n.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                  editingNote?.id === n.id
                    ? 'bg-blue-50/60 border-blue-200'
                    : 'bg-white/50 border-gray-100 hover:bg-white/80'
                }`}
                onClick={() => startEdit(n)}
              >
                <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
                  {formatTime(n)}
                </span>
                <span className="flex-1 text-xs text-gray-500 truncate">
                  {n.content ? truncate(n.content) : '—'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(n);
                  }}
                  className="p-1 rounded-lg opacity-0 group-hover:opacity-60 hover:opacity-100 hover:bg-blue-50 transition-all flex-shrink-0"
                  title="编辑随笔"
                >
                  <Pencil size={13} className="text-blue-400" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDeleteNote(n);
                  }}
                  className="p-1 rounded-lg opacity-0 group-hover:opacity-60 hover:opacity-100 hover:bg-red-50 transition-all flex-shrink-0"
                  title="删除随笔"
                >
                  <Trash2 size={13} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最近随笔（过去30天，排除今天） */}
      {recentNotes.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-gray-400 mb-2">📖 最近随笔</div>
          <div className="space-y-1.5">
            {recentNotes.map((n) => (
              <div
                key={n.id}
                className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50 border border-gray-100"
              >
                <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
                  {n.date.slice(5)}
                </span>
                <span className="flex-1 text-xs text-gray-500 truncate">
                  {n.content ? truncate(n.content) : '—'}
                </span>
                <button
                  onClick={() => setPendingDeleteNote(n)}
                  className="p-1 rounded-lg opacity-0 group-hover:opacity-60 hover:opacity-100 hover:bg-red-50 transition-all flex-shrink-0"
                  title="删除随笔"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
          <div className="text-center text-xs text-gray-400 mt-2">
            完整历史请查看统计页面
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDeleteNote}
        title="删除随笔"
        message={`确定要删除 ${pendingDeleteNote?.date.slice(5)} 的随笔吗？`}
        onConfirm={() => {
          if (pendingDeleteNote) handleDeleteNote(pendingDeleteNote);
          setPendingDeleteNote(null);
        }}
        onCancel={() => setPendingDeleteNote(null)}
        confirmText="删除"
      />
    </div>
  );
}
