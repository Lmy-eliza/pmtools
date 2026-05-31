import { useState, useEffect } from 'react';
import type { DailyNote } from '../../types';
import { ensureDateStr } from '../../utils/dateUtils';
import { useNoteStore } from '../../stores/noteStore';

interface Props {
  notes: DailyNote[];
  defaultStart: string; // 当前统计周期起始日 YYYY-MM-DD
  defaultEnd: string;   // 当前统计周期结束日 YYYY-MM-DD
}

export default function NoteHistorySection({ notes, defaultStart, defaultEnd }: Props) {
  const { fetchNotesRange } = useNoteStore();

  // 日期筛选模式：follow=跟随当前周期，custom=自定义范围
  const [filterMode, setFilterMode] = useState<'follow' | 'custom'>('follow');
  const [customStart, setCustomStart] = useState(defaultStart);
  const [customEnd, setCustomEnd] = useState(defaultEnd);
  const [customNotes, setCustomNotes] = useState<DailyNote[]>([]);
  const [customLoading, setCustomLoading] = useState(false);

  // 统计周期变化时，重置为跟随模式
  useEffect(() => {
    setFilterMode('follow');
    setCustomStart(defaultStart);
    setCustomEnd(defaultEnd);
  }, [defaultStart, defaultEnd]);

  // 自定义范围时加载数据
  const handleCustomSearch = async () => {
    if (!customStart || !customEnd) return;
    setCustomLoading(true);
    try {
      const result = await fetchNotesRange(customStart, customEnd);
      setCustomNotes(result);
    } catch {
      setCustomNotes([]);
    }
    setCustomLoading(false);
  };

  // 当前显示的数据源
  const displayNotes = filterMode === 'follow' ? notes : customNotes;

  // Sort by date descending
  const sorted = [...displayNotes]
    .filter((n) => n.content)
    .sort((a, b) => (a.date > b.date ? -1 : 1));

  return (
    <div className="bg-white/60 rounded-2xl p-5 shadow-sm border border-white/50 flex flex-col">
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span>📖</span> 过往随笔
        </h3>
        <div className="flex items-center gap-2">
          {/* 跟随周期标签 */}
          <button
            onClick={() => setFilterMode('follow')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              filterMode === 'follow'
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            📅 跟随周期
          </button>
          {/* 自定义范围按钮 */}
          <button
            onClick={() => setFilterMode('custom')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              filterMode === 'custom'
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            🔍 自定义范围
          </button>
        </div>
      </div>

      {/* 自定义范围输入区 */}
      {filterMode === 'custom' && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white/80 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <span className="text-xs text-gray-400">至</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white/80 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            onClick={handleCustomSearch}
            disabled={customLoading}
            className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {customLoading ? '加载中...' : '查询'}
          </button>
        </div>
      )}

      {/* 随笔列表 */}
      {sorted.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm flex-1 flex items-center justify-center">
          {filterMode === 'custom' && customNotes.length === 0 && !customLoading
            ? '该范围暂无随笔记录，请点击"查询"加载数据'
            : '该时间段暂无随笔记录'}
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-2 pr-1 flex-1">
          {sorted.map((note) => (
            <div
              key={note.id}
              className="rounded-xl bg-white/70 border border-gray-100 px-4 py-3"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-gray-400 font-mono">
                  {ensureDateStr(note.date)}
                </span>
              </div>
              {note.content && (
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
