import { useState } from 'react';
import { MOOD_OPTIONS } from '../../types';

interface Props {
  value: string;
  onChange: (emoji: string, score: number) => void;
}

export default function MoodPicker({ value, onChange }: Props) {
  const [animating, setAnimating] = useState<string | null>(null);

  const handleClick = (emoji: string, score: number) => {
    setAnimating(emoji);
    onChange(emoji, score);
    setTimeout(() => setAnimating(null), 300);
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {MOOD_OPTIONS.map((opt) => (
        <button
          key={opt.emoji}
          type="button"
          onClick={() => handleClick(opt.emoji, opt.score)}
          // #13: hover tooltip showing score
          title={`${opt.label} (${opt.score}分)`}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
            value === opt.emoji
              ? 'bg-blue-50 ring-2 ring-blue-300 shadow-sm'
              : 'hover:bg-gray-50'
          } ${animating === opt.emoji ? 'mood-bounce' : ''}`}
        >
          <span className="text-2xl">{opt.emoji}</span>
          <span className="text-[10px] text-gray-500">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
