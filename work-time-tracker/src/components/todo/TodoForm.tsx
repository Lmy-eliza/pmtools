import { useState, useEffect, useRef } from 'react';
import type { Tag } from '../../types';
import { useTagStore } from '../../stores/tagStore';
import TagPicker from './TagPicker';
import Button from '../ui/Button';
import { Plus } from 'lucide-react';

interface Props {
  date: string;
  onSubmit: (data: {
    title: string;
    description: string;
    tag_id: string;
    tag_name: string;
    color: string;
    date?: string;
  }) => void;
  onCancel?: () => void;
  submitting?: boolean;
  defaultTag?: Tag | null;
  onSubmitWithTag?: (tag: Tag | null) => void;
}

export default function TodoForm({ date, onSubmit, onCancel, submitting, defaultTag, onSubmitWithTag }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTag, setSelectedTag] = useState<Tag | null>(defaultTag || null);
  // #18: date selection for future todos
  const [selectedDate, setSelectedDate] = useState(date);
  const { tags } = useTagStore();
  const titleRef = useRef<HTMLInputElement>(null);

  // Update selected tag if defaultTag changes (continuous mode)
  useEffect(() => {
    if (defaultTag) {
      setSelectedTag(defaultTag);
    }
  }, [defaultTag]);

  // Update date when parent date changes
  useEffect(() => {
    setSelectedDate(date);
  }, [date]);

  // Auto-focus title input
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tag = selectedTag || tags[0];
    if (!tag) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      tag_id: tag.id,
      tag_name: tag.name,
      color: tag.color,
      date: selectedDate !== date ? selectedDate : undefined,
    });

    // Report current tag to parent for continuous mode
    if (onSubmitWithTag) {
      onSubmitWithTag(tag);
    }

    // Clear title and description for continuous mode
    setTitle('');
    setDescription('');
    setSelectedDate(date);

    // Re-focus title
    setTimeout(() => titleRef.current?.focus(), 50);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        ref={titleRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="输入待办标题..."
        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
        autoFocus
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = target.scrollHeight + 'px';
        }}
        placeholder="描述（可选）"
        rows={2}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm resize-none"
      />

      <TagPicker
        value={selectedTag?.id || ''}
        onChange={setSelectedTag}
      />

      {/* #18: Date picker for future todos */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">日期:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
        />
        {selectedDate !== date && (
          <span className="text-xs text-amber-500">
            将添加到 {selectedDate.slice(5)}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={!title.trim() || submitting}>
          <Plus size={14} />
          {submitting ? '添加中...' : '添加'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            取消
          </Button>
        )}
      </div>
    </form>
  );
}
