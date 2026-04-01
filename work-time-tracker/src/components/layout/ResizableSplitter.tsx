import { useCallback, useRef, useState, useEffect } from 'react';

interface Props {
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  children: [React.ReactNode, React.ReactNode];
}

export default function ResizableSplitter({
  defaultWidth = 320,
  minWidth = 200,
  maxWidth = 800,
  children,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem('wtt-splitter-width');
    return saved ? Number(saved) : defaultWidth;
  });
  const [dynamicMax, setDynamicMax] = useState(maxWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  // #1 fix: track latest width in ref to avoid stale closure
  const latestWidth = useRef(leftWidth);

  // Keep ref in sync
  useEffect(() => {
    latestWidth.current = leftWidth;
  }, [leftWidth]);

  // #15: Dynamic max = containerWidth - minWidth (symmetric)
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const containerWidth = entry.contentRect.width;
        // Left max = container - minWidth, so right side also has at least minWidth
        const newMax = Math.max(maxWidth, containerWidth - minWidth);
        setDynamicMax(newMax);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [maxWidth, minWidth]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = leftWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [leftWidth]
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - startX.current;
      const newWidth = Math.min(dynamicMax, Math.max(minWidth, startWidth.current + dx));
      setLeftWidth(newWidth);
    };

    const onMouseUp = () => {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        // #1 fix: use ref for latest width to avoid stale closure
        localStorage.setItem('wtt-splitter-width', String(latestWidth.current));
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      // #1 fix: save width on unmount (page switch) if still dragging
      if (dragging.current) {
        localStorage.setItem('wtt-splitter-width', String(latestWidth.current));
        dragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [minWidth, dynamicMax]);

  return (
    <div ref={containerRef} className="flex h-full">
      {/* Left */}
      <div
        className="flex-shrink-0 overflow-y-auto"
        style={{ width: leftWidth }}
      >
        {children[0]}
      </div>

      {/* Splitter handle */}
      <div
        className="w-1 cursor-col-resize hover:bg-blue-300/50 active:bg-blue-400/50 transition-colors flex-shrink-0 bg-gray-200/60"
        onMouseDown={onMouseDown}
      />

      {/* Right */}
      <div className="flex-1 overflow-y-auto">{children[1]}</div>
    </div>
  );
}
