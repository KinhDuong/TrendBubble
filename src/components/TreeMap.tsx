import { TrendingTopic } from '../types';
import { useEffect, useState } from 'react';

interface TreeMapProps {
  topics: TrendingTopic[];
  maxDisplay?: number;
  theme: 'dark' | 'light';
}

interface TreeMapNode {
  topic: TrendingTopic;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  category: string;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const categoryColors: { [key: string]: string } = {
  'Technology': '#FF6B6B',
  'Business': '#4ECDC4',
  'Entertainment': '#95E1D3',
  'Sports': '#F38181',
  'Politics': '#AA96DA',
  'Science': '#FCBAD3',
  'Health': '#FFFFD2',
  'Education': '#A8D8EA',
  'Travel': '#AA96DA',
  'Food': '#FFA07A',
  'Fashion': '#FFB6C1',
  'Gaming': '#98D8C8',
  'Music': '#F7DC6F',
  'Art': '#BB8FCE',
  'Finance': '#85C1E2',
  'Real Estate': '#F8B739',
  'Automotive': '#52B788',
  'Environment': '#2D6A4F',
};

function getColorForCategory(category: string, topicIndex: number): string {
  if (categoryColors[category]) {
    return categoryColors[category];
  }
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  const lightness = 50 + (topicIndex % 3) * 5;
  return `hsl(${hue}, 70%, ${lightness}%)`;
}

function squarify(
  items: { topic: TrendingTopic; value: number; category: string; index: number }[],
  rect: Rect
): TreeMapNode[] {
  if (items.length === 0) return [];

  const nodes: TreeMapNode[] = [];
  const totalValue = items.reduce((sum, item) => sum + item.value, 0);

  function layoutRow(
    row: typeof items,
    rect: Rect,
    vertical: boolean
  ): { nodes: TreeMapNode[]; remaining: Rect } {
    const rowNodes: TreeMapNode[] = [];
    const rowValue = row.reduce((sum, item) => sum + item.value, 0);
    const ratio = rowValue / totalValue;

    let offset = 0;

    row.forEach((item) => {
      const itemRatio = item.value / rowValue;

      let x, y, width, height;
      if (vertical) {
        width = rect.width;
        height = rect.height * ratio * itemRatio;
        x = rect.x;
        y = rect.y + offset;
        offset += height;
      } else {
        width = rect.width * ratio * itemRatio;
        height = rect.height;
        x = rect.x + offset;
        y = rect.y;
        offset += width;
      }

      rowNodes.push({
        topic: item.topic,
        x,
        y,
        width,
        height,
        color: getColorForCategory(item.category, item.index),
        category: item.category
      });
    });

    const remaining = vertical
      ? { x: rect.x, y: rect.y + rect.height * ratio, width: rect.width, height: rect.height * (1 - ratio) }
      : { x: rect.x + rect.width * ratio, y: rect.y, width: rect.width * (1 - ratio), height: rect.height };

    return { nodes: rowNodes, remaining };
  }

  function worstAspectRatio(row: typeof items, length: number): number {
    if (row.length === 0) return Infinity;

    const sum = row.reduce((s, item) => s + item.value, 0);
    const maxVal = Math.max(...row.map(item => item.value));
    const minVal = Math.min(...row.map(item => item.value));

    const lengthSq = length * length;
    const sumSq = sum * sum;

    return Math.max(
      (lengthSq * maxVal) / sumSq,
      sumSq / (lengthSq * minVal)
    );
  }

  function squarifyRecursive(
    items: typeof items,
    rect: Rect,
    row: typeof items = []
  ): TreeMapNode[] {
    if (items.length === 0) {
      if (row.length === 0) return [];
      const vertical = rect.width >= rect.height;
      const { nodes } = layoutRow(row, rect, vertical);
      return nodes;
    }

    const item = items[0];
    const vertical = rect.width >= rect.height;
    const length = vertical ? rect.width : rect.height;

    const newRow = [...row, item];
    const currentWorst = worstAspectRatio(row, length);
    const newWorst = worstAspectRatio(newRow, length);

    if (row.length === 0 || newWorst <= currentWorst) {
      return squarifyRecursive(items.slice(1), rect, newRow);
    } else {
      const { nodes, remaining } = layoutRow(row, rect, vertical);
      return [...nodes, ...squarifyRecursive(items, remaining, [])];
    }
  }

  return squarifyRecursive(items, rect);
}

export default function TreeMap({ topics, maxDisplay = 50, theme }: TreeMapProps) {
  const [nodes, setNodes] = useState<TreeMapNode[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const displayTopics = topics.slice(0, maxDisplay).sort((a, b) => b.searchVolume - a.searchVolume);

    const containerWidth = 1200;
    const containerHeight = 800;

    const items = displayTopics.map((topic, index) => ({
      topic,
      value: topic.searchVolume,
      category: topic.category || 'Other',
      index
    }));

    const rect = {
      x: 0,
      y: 0,
      width: containerWidth,
      height: containerHeight
    };

    const calculatedNodes = squarify(items, rect);
    setNodes(calculatedNodes);
  }, [topics, maxDisplay, theme]);

  return (
    <div className={`w-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg overflow-hidden`}>
      <div className="relative w-full" style={{ paddingBottom: '66.67%' }}>
        <svg
          viewBox="0 0 1200 800"
          className="absolute inset-0 w-full h-full"
          style={{ maxHeight: '800px' }}
        >
          {nodes.map((node, index) => {
            const isHovered = hoveredIndex === index;
            const minDimension = Math.min(node.width, node.height);
            const baseFontSize = minDimension / 10;
            const fontSize = Math.max(10, Math.min(baseFontSize, 24));
            const showText = minDimension > 40;
            const showValue = minDimension > 60;

            const maxChars = Math.floor(node.width / (fontSize * 0.6));
            let displayName = node.topic.name.replace(/"/g, '');
            if (displayName.length > maxChars) {
              displayName = displayName.substring(0, maxChars - 3) + '...';
            }

            const textColor = theme === 'dark' ? '#ffffff' : '#000000';
            const strokeColor = theme === 'dark' ? '#1f2937' : '#ffffff';

            return (
              <g key={index}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  fill={node.color}
                  opacity={isHovered ? 0.9 : 0.8}
                  stroke={strokeColor}
                  strokeWidth="2"
                  className="transition-opacity duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                {showText && (
                  <>
                    <text
                      x={node.x + node.width / 2}
                      y={node.y + node.height / 2 + (showValue ? -fontSize / 3 : fontSize / 3)}
                      textAnchor="middle"
                      fill={textColor}
                      fontSize={fontSize}
                      fontWeight="700"
                      className="pointer-events-none select-none"
                      style={{
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                      }}
                    >
                      {displayName}
                    </text>
                    {showValue && (
                      <text
                        x={node.x + node.width / 2}
                        y={node.y + node.height / 2 + fontSize * 0.8}
                        textAnchor="middle"
                        fill={textColor}
                        fontSize={fontSize * 0.7}
                        fontWeight="600"
                        className="pointer-events-none select-none"
                        style={{
                          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                        }}
                      >
                        {node.topic.searchVolumeRaw.replace(/"/g, '')}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {hoveredIndex !== null && nodes[hoveredIndex] && (
        <div className={`mt-4 mx-4 mb-4 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}>
          <h3 className={`font-semibold text-lg mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {nodes[hoveredIndex].topic.name.replace(/"/g, '')}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Search Volume: {nodes[hoveredIndex].topic.searchVolumeRaw.replace(/"/g, '')}
            </span>
            {nodes[hoveredIndex].topic.category && (
              <span className={`px-2 py-0.5 rounded text-xs ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                {nodes[hoveredIndex].topic.category}
              </span>
            )}
            {nodes[hoveredIndex].topic.pubDate && (
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                {new Date(nodes[hoveredIndex].topic.pubDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
