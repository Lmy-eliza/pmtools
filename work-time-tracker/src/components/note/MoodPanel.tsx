import { useEffect, useState, useCallback } from 'react';
import { useMoodLogStore } from '../../stores/moodLogStore';
import MoodPicker from './MoodPicker';
import { X } from 'lucide-react';
import { MOOD_OPTIONS } from '../../types';

interface Props {
  date: string;
}

export default function MoodPanel({ date }: Props) {
  const { logs, fetchLogs, addLog, deleteLog } = useMoodLogStore();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchLogs(date);
  }, [date, fetchLogs]);

  const handleMoodSelect = useCallback(async (emoji: string, score: number) => {
    setError('');
    try {
      // 只写 moodLog 表，不再碰 note 表
      await addLog(date, emoji, score);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存心情失败');
    }
  }, [date, addLog]);

  const handleDeleteLog = async (id: string) => {
    try {
      await deleteLog(id);
    } catch {
      // silent
    }
  };

  // 计算平均分
  const avgScore = logs.length > 0
    ? (logs.reduce((sum, l) => sum + l.score, 0) / logs.length).toFixed(1)
    : null;

  // 根据 emoji 获取标签
  const getLabel = (emoji: string) => {
    const opt = MOOD_OPTIONS.find(o => o.emoji === emoji);
    return opt ? `${opt.label} (${opt.score}分)` : '';
  };

  return (
    <div className="space-y-4">
      {/* Mood Picker */}
      <div>
        <div className="text-sm font-medium text-gray-600 mb-2">记录心情</div>
        <MoodPicker
          value=""
          onChange={handleMoodSelect}
        />
      </div>

      {/* Error / Success */}
      {error && (
        <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          ❌ {error}
        </div>
      )}
      {saved && (
        <div className="px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-green-600 text-sm">
          ✅ 已记录
        </div>
      )}

      {/* 今日心情记录 */}
      {logs.length > 0 && (
        <div className="bg-white/60 rounded-xl p-3 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">今日心情记录</span>
            {avgScore && (
              <span className="text-xs text-gray-500 bg-blue-50 px-2 py-0.5 rounded-full">
                均分: {avgScore}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {logs.map((log) => (
              <div
                key={log.id}
                className="group inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 border border-gray-100 text-sm"
                title={getLabel(log.emoji)}
              >
                <span>{log.emoji}</span>
                <span className="text-[10px] text-gray-400 font-mono">{log.time}</span>
                <button
                  onClick={() => handleDeleteLog(log.id)}
                  className="p-0.5 rounded opacity-0 group-hover:opacity-60 hover:opacity-100 transition-all"
                >
                  <X size={10} className="text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 无记录提示 */}
      {logs.length === 0 && (
        <div className="text-center py-6 text-gray-400 text-sm">
          <div className="text-3xl mb-2">😊</div>
          <div>点击上方表情记录今天的心情</div>
          <div className="text-xs mt-1">每次点击都会新增一条记录</div>
        </div>
      )}
    </div>
  );
}
