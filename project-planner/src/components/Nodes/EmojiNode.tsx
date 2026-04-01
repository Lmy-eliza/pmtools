import React, { useRef, useEffect, useState } from 'react';
import { Group, Text, Rect, Image } from 'react-konva';
import { formatShortDate } from '../../utils/dateUtils';
import type { PlanNode } from '../../types';

interface EmojiNodeProps {
  node: PlanNode;
  isSelected: boolean;
  isConnectionStart: boolean;
  onClick: () => void;
  onDrag: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
}

/**
 * 将Emoji渲染为Canvas图片
 * Konva的Text组件不支持彩色Emoji，需要使用Canvas API转换
 */
function createEmojiCanvas(emoji: string, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const scale = 2; // 高清渲染
  canvas.width = size * scale;
  canvas.height = size * scale;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(scale, scale);
    ctx.font = `${size * 0.75}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2);
  }
  return canvas;
}

export const EmojiNode: React.FC<EmojiNodeProps> = ({
  node,
  isSelected,
  isConnectionStart,
  onClick,
  onDrag,
  onDragEnd,
}) => {
  const groupRef = useRef<any>(null);
  const size = 40;
  const [emojiImage, setEmojiImage] = useState<HTMLCanvasElement | null>(null);

  // 创建Emoji图片
  useEffect(() => {
    const canvas = createEmojiCanvas(node.emoji || '😀', size);
    setEmojiImage(canvas);
  }, [node.emoji]);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position({ x: node.x, y: node.y });
      groupRef.current.getLayer()?.batchDraw();
    }
  }, [node.x, node.y]);

  return (
    <Group
      ref={groupRef}
      x={node.x}
      y={node.y}
      draggable
      onClick={onClick}
      onTap={onClick}
      onDragMove={(e) => {
        const pos = e.target.position();
        onDrag(pos.x, pos.y);
      }}
      onDragEnd={(e) => {
        const pos = e.target.position();
        onDragEnd(pos.x, pos.y);
      }}
    >
      {/* 日期显示在节点上方 */}
      <Text
        text={formatShortDate(node.date)}
        fontSize={10}
        fill="#6b7280"
        y={-size / 2 - 18}
        width={60}
        offsetX={30}
        align="center"
      />

      {/* 选中/连线起点高亮 */}
      {(isSelected || isConnectionStart) && (
        <Rect
          x={-size / 2 - 4}
          y={-size / 2 - 4}
          width={size + 8}
          height={size + 8}
          fill="transparent"
          stroke={isConnectionStart ? '#FF9500' : '#007AFF'}
          strokeWidth={2}
          cornerRadius={8}
          dash={isConnectionStart ? [4, 4] : undefined}
        />
      )}

      {/* Emoji 图片 - 使用Canvas渲染解决Konva不支持彩色Emoji的问题 */}
      {emojiImage && (
        <Image
          image={emojiImage}
          width={size}
          height={size}
          offsetX={size / 2}
          offsetY={size / 2}
        />
      )}

      {/* 节点名称 */}
      <Text
        text={node.name}
        fontSize={11}
        fill="#374151"
        y={size / 2 + 4}
        width={80}
        offsetX={40}
        align="center"
      />
    </Group>
  );
};

export default EmojiNode;
