import { TrendingTopic } from '../types';
import { useEffect, useState } from 'react';

interface TreeMapProps {
  topics: TrendingTopic[];
  maxDisplay?: number;
  theme: 'dark' | 'light';
}

interface TreeMapNode {
  topic: TrendingTopic | null;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isFiller?: boolean;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function squarify(
  topics: TrendingTopic[],
  rect: Rect,
  padding: number,
  theme: 'dark' | 'light',
  maxDisplay: number
): TreeMapNode[] {
  if (topics.length === 0) return [];

  const totalValue = topics.reduce((sum, t) => sum + t.searchVolume, 0);
  const nodes: TreeMapNode[] = [];

  function layoutRow(
    row: TrendingTopic[],
    rect: Rect,
    vertical: boolean,
    startIndex: number
  ) {
    const rowValue = row.reduce((sum, t) => sum + t.searchVolume, 0);
    let offset = vertical ? rect.x : rect.y;

    row.forEach((topic, i) => {
      const ratio = topic.searchVolume / rowValue;
      const index = startIndex + i;
      const hue = (index * 360) / maxDisplay;
      const color = theme === 'dark'
        ? `hsl(${hue}, 70%, 60%)`
        : `hsl(${hue}, 70%, 50%)`;

      if (vertical) {
        const width = ratio * rect.width;
        nodes.push({
          topic,
          x: offset + padding / 2,
          y: rect.y + padding / 2,
          width: width - padding,
          height: rect.height - padding,
          color
        });
        offset += width;
      } else {
        const height = ratio * rect.height;
        nodes.push({
          topic,
          x: rect.x + padding / 2,
          y: offset + padding / 2,
          width: rect.width - padding,
          height: height - padding,
          color
        });
        offset += height;
      }
    });
  }

  function squarifyRecursive(
    remaining: TrendingTopic[],
    rect: Rect,
    startIndex: number
  ) {
    if (remaining.length === 0) return;
    if (remaining.length === 1) {
      const topic = remaining[0];
      const hue = (startIndex * 360) / maxDisplay;
      const color = theme === 'dark'
        ? `hsl(${hue}, 70%, 60%)`
        : `hsl(${hue}, 70%, 50%)`;

      nodes.push({
        topic,
        x: rect.x + padding / 2,
        y: rect.y + padding / 2,
        width: rect.width - padding,
        height: rect.height - padding,
        color
      });
      return;
    }

    const vertical = rect.width >= rect.height;
    const total = remaining.reduce((sum, t) => sum + t.searchVolume, 0);

    let bestRow: TrendingTopic[] = [];
    let bestAspectRatio = Infinity;

    for (let i = 1; i <= remaining.length; i++) {
      const row = remaining.slice(0, i);
      const rowValue = row.reduce((sum, t) => sum + t.searchVolume, 0);
      const rowRatio = rowValue / total;

      const rowDimension = vertical ? rect.width * rowRatio : rect.height * rowRatio;
      const otherDimension = vertical ? rect.height : rect.width;

      let maxAspect = 0;
      row.forEach((topic) => {
        const itemRatio = topic.searchVolume / rowValue;
        const itemPrimary = itemRatio * otherDimension;
        const aspect = Math.max(
          rowDimension / itemPrimary,
          itemPrimary / rowDimension
        );
        maxAspect = Math.max(maxAspect, aspect);
      });

      if (maxAspect < bestAspectRatio) {
        bestAspectRatio = maxAspect;
        bestRow = row;
      } else {
        break;
      }
    }

    if (bestRow.length === 0) bestRow = [remaining[0]];

    const rowValue = bestRow.reduce((sum, t) => sum + t.searchVolume, 0);
    const rowRatio = rowValue / total;

    layoutRow(bestRow, rect, vertical, startIndex);

    const nextRect: Rect = vertical
      ? {
          x: rect.x + rect.width * rowRatio,
          y: rect.y,
          width: rect.width * (1 - rowRatio),
          height: rect.height
        }
      : {
          x: rect.x,
          y: rect.y + rect.height * rowRatio,
          width: rect.width,
          height: rect.height * (1 - rowRatio)
        };

    squarifyRecursive(
      remaining.slice(bestRow.length),
      nextRect,
      startIndex + bestRow.length
    );
  }

  squarifyRecursive(topics, rect, 0);
  return nodes;
}

function addFillerBoxes(
  nodes: TreeMapNode[],
  containerWidth: number,
  containerHeight: number,
  padding: number,
  theme: 'dark' | 'light'
): TreeMapNode[] {
  const fillerColor = theme === 'dark'
    ? 'hsl(220, 10%, 25%)'
    : 'hsl(220, 10%, 85%)';

  const occupiedSpace: { x: number; y: number; width: number; height: number }[] = nodes.map(n => ({
    x: n.x - padding / 2,
    y: n.y - padding / 2,
    width: n.width + padding,
    height: n.height + padding
  }));

  function isSpaceOccupied(x: number, y: number, width: number, height: number): boolean {
    return occupiedSpace.some(occupied => {
      return !(
        x + width <= occupied.x ||
        x >= occupied.x + occupied.width ||
        y + height <= occupied.y ||
        y >= occupied.y + occupied.height
      );
    });
  }

  const fillers: TreeMapNode[] = [];
  const minFillerSize = 20;
  const gridSize = 10;

  for (let y = 0; y < containerHeight; y += gridSize) {
    for (let x = 0; x < containerWidth; x += gridSize) {
      let maxWidth = containerWidth - x;
      let maxHeight = containerHeight - y;

      for (const occupied of occupiedSpace) {
        if (y >= occupied.y && y < occupied.y + occupied.height) {
          if (x < occupied.x) {
            maxWidth = Math.min(maxWidth, occupied.x - x);
          }
        }
        if (x >= occupied.x && x < occupied.x + occupied.width) {
          if (y < occupied.y) {
            maxHeight = Math.min(maxHeight, occupied.y - y);
          }
        }
      }

      if (maxWidth >= minFillerSize && maxHeight >= minFillerSize && !isSpaceOccupied(x, y, maxWidth, maxHeight)) {
        fillers.push({
          topic: null,
          x: x + padding / 2,
          y: y + padding / 2,
          width: maxWidth - padding,
          height: maxHeight - padding,
          color: fillerColor,
          isFiller: true
        });

        occupiedSpace.push({ x, y, width: maxWidth, height: maxHeight });
      }
    }
  }

  return [...nodes, ...fillers];
}

export default function TreeMap({ topics, maxDisplay = 50, theme }: TreeMapProps) {
  const [nodes, setNodes] = useState<TreeMapNode[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const displayTopics = topics.slice(0, maxDisplay);

    const containerWidth = 1200;
    const containerHeight = 800;
    const padding = 3;

    const rect: Rect = {
      x: 0,
      y: 0,
      width: containerWidth,
      height: containerHeight
    };

    const treeMapNodes = squarify(displayTopics, rect, padding, theme, maxDisplay);
    const withFillers = addFillerBoxes(treeMapNodes, containerWidth, containerHeight, padding, theme);

    setNodes(withFillers);
  }, [topics, maxDisplay, theme]);

  return (
    <div className={`w-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-4`}>
      <div className="relative w-full" style={{ paddingBottom: '66.67%' }}>
        <svg
          viewBox="0 0 1200 800"
          className="absolute inset-0 w-full h-full"
          style={{ maxHeight: '800px' }}
        >
          {nodes.map((node, index) => {
            if (node.isFiller) {
              return (
                <rect
                  key={`filler-${index}`}
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  fill={node.color}
                  opacity={0.3}
                  stroke={theme === 'dark' ? '#1f2937' : '#e5e7eb'}
                  strokeWidth="1"
                />
              );
            }

            const isHovered = hoveredIndex === index;
            const fontSize = Math.min(node.width, node.height) / 8;
            const showText = fontSize > 8 && node.topic;

            return (
              <g key={index}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  fill={node.color}
                  opacity={isHovered ? 1 : 0.85}
                  stroke={theme === 'dark' ? '#1f2937' : '#e5e7eb'}
                  strokeWidth="1"
                  className="transition-opacity duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                {showText && node.topic && (
                  <>
                    <text
                      x={node.x + node.width / 2}
                      y={node.y + node.height / 2 - fontSize / 2}
                      textAnchor="middle"
                      fill="white"
                      fontSize={fontSize}
                      fontWeight="600"
                      className="pointer-events-none select-none"
                      style={{
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))'
                      }}
                    >
                      {node.topic.name.replace(/"/g, '').length > 20
                        ? node.topic.name.replace(/"/g, '').substring(0, 20) + '...'
                        : node.topic.name.replace(/"/g, '')}
                    </text>
                    <text
                      x={node.x + node.width / 2}
                      y={node.y + node.height / 2 + fontSize}
                      textAnchor="middle"
                      fill="white"
                      fontSize={fontSize * 0.7}
                      fontWeight="500"
                      className="pointer-events-none select-none"
                      style={{
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))'
                      }}
                    >
                      {node.topic.searchVolumeRaw.replace(/"/g, '')}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {hoveredIndex !== null && nodes[hoveredIndex] && nodes[hoveredIndex].topic && (
        <div className={`mt-4 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}>
          <h3 className={`font-semibold text-lg mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {nodes[hoveredIndex].topic!.name.replace(/"/g, '')}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Search Volume: {nodes[hoveredIndex].topic!.searchVolumeRaw.replace(/"/g, '')}
            </span>
            {nodes[hoveredIndex].topic!.category && (
              <span className={`px-2 py-0.5 rounded text-xs ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                {nodes[hoveredIndex].topic!.category}
              </span>
            )}
            {nodes[hoveredIndex].topic!.pubDate && (
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                {new Date(nodes[hoveredIndex].topic!.pubDate).toLocaleDateString('en-US', {
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
