import { useState, useEffect, useCallback } from 'react';

interface NavItem {
  id: string;
  emoji: string;
  label: string;
}

interface Props {
  items: NavItem[];
  scrollContainer?: HTMLElement | null;
}

export default function FloatingNav({ items, scrollContainer }: Props) {
  const [activeId, setActiveId] = useState(items[0]?.id || '');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Track which section is visible
  useEffect(() => {
    const container = scrollContainer;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      {
        root: container,
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items, scrollContainer]);

  const handleClick = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    []
  );

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
      {items.map((item) => {
        const isActive = activeId === item.id;
        const isHovered = hoveredId === item.id;

        return (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ${
              isActive
                ? 'bg-blue-500 text-white shadow-md shadow-blue-200'
                : 'bg-white/80 hover:bg-white text-gray-600 shadow-sm border border-gray-100'
            }`}
            title={item.label}
          >
            <span className="text-sm">{item.emoji}</span>
            {/* Label tooltip */}
            {(isHovered || isActive) && (
              <span
                className={`absolute right-12 whitespace-nowrap text-xs px-2 py-1 rounded-lg shadow-sm transition-opacity duration-200 ${
                  isActive ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 border border-gray-100'
                }`}
              >
                {item.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
