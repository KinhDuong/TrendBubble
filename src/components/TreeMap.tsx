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
}

function createTreeMap(
  topics: TrendingTopic[],
  width: number,
  height: number,
  theme: 'dark' | 'light',
  maxDisplay: number
): TreeMapNode[] {
  if (topics.length === 0) return [];

  const nodes: TreeMapNode[] = [];
  const totalValue = topics.reduce((sum, t) => sum + t.searchVolume, 0);

  function squarify(
    items: TrendingTopic[],
    x: number,
    y: number,
    w: number,
    h: number,
    startIndex: number
  ) {
    if (items.length === 0) return;

    if (items.length === 1) {
      const item = items[0];
      const hue = (startIndex * 360) / maxDisplay;
      const color = theme === 'dark'
        ? `hsl(${hue}, 70%, 60%)`
        : `hsl(${hue}, 70%, 50%)`;

      nodes.push({
        topic: item,
        x: x + 1,
        y: y + 1,
        width: w - 2,
        height: h - 2,
        color
      });
      return;
    }

    const isHorizontal = w >= h;
    const total = items.reduce((sum, t) => sum + t.searchVolume, 0);

    let bestSplit = 1;
    let bestRatio = Infinity;

    for (let i = 1; i < items.length; i++) {
      const firstGroup = items.slice(0, i);
      const firstTotal = firstGroup.reduce((sum, t) => sum + t.searchVolume, 0);
      const ratio = firstTotal / total;

      const dim1 = isHorizontal ? w * ratio : h * ratio;
      const dim2 = isHorizontal ? h : w;

      let maxAspect = 0;
      firstGroup.forEach(item => {
        const itemRatio = item.searchVolume / firstTotal;
        const itemDim = itemRatio * dim2;
        const aspect = Math.max(dim1 / itemDim, itemDim / dim1);
        maxAspect = Math.max(maxAspect, aspect);
      });

      if (maxAspect < bestRatio) {
        bestRatio = maxAspect;
        bestSplit = i;
      }
    }

    const firstGroup = items.slice(0, bestSplit);
    const secondGroup = items.slice(bestSplit);
    const firstTotal = firstGroup.reduce((sum, t) => sum + t.searchVolume, 0);
    const ratio = firstTotal / total;

    if (isHorizontal) {
      const splitX = x + w * ratio;
      layoutRow(firstGroup, x, y, w * ratio, h, false, startIndex);
      squarify(secondGroup, splitX, y, w * (1 - ratio), h, startIndex + bestSplit);
    } else {
      const splitY = y + h * ratio;
      layoutRow(firstGroup, x, y, w, h * ratio, true, startIndex);
      squarify(secondGroup, x, splitY, w, h * (1 - ratio), startIndex + bestSplit);
    }
  }

  function layoutRow(
    items: TrendingTopic[],
    x: number,
    y: number,
    w: number,
    h: number,
    isVertical: boolean,
    startIndex: number
  ) {
    const total = items.reduce((sum, t) => sum + t.searchVolume, 0);
    let offset = isVertical ? y : x;

    items.forEach((item, i) => {
      const ratio = item.searchVolume / total;
      const index = startIndex + i;
      const hue = (index * 360) / maxDisplay;
      const color = theme === 'dark'
        ? `hsl(${hue}, 70%, 60%)`
        : `hsl(${hue}, 70%, 50%)`;

      if (isVertical) {
        const itemHeight = h * ratio;
        nodes.push({
          topic: item,
          x: x + 1,
          y: offset + 1,
          width: w - 2,
          height: itemHeight - 2,
          color
        });
        offset += itemHeight;
      } else {
        const itemWidth = w * ratio;
        nodes.push({
          topic: item,
          x: offset + 1,
          y: y + 1,
          width: itemWidth - 2,
          height: h - 2,
          color
        });
        offset += itemWidth;
      }
    });
  }

  squarify(topics, 0, 0, width, height, 0);
  return nodes;
}

export default function TreeMap({ topics, maxDisplay = 50, theme }: TreeMapProps) {
  const [nodes, setNodes] = useState<TreeMapNode[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const displayTopics = topics.slice(0, maxDisplay);
    const containerWidth = 1200;
    const containerHeight = 800;

    const treeMapNodes = createTreeMap(displayTopics, containerWidth, containerHeight, theme, maxDisplay);
    setNodes(treeMapNodes);
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
            const isHovered = hoveredIndex === index;
            const fontSize = Math.min(node.width, node.height) / 8;
            const showText = fontSize > 8;

            let wrappedLines: string[] = [];
            if (showText) {
              const text = node.topic.name.replace(/"/g, '');
              const avgCharWidth = fontSize * 0.6;
              const maxCharsPerLine = Math.floor(node.width / avgCharWidth);

              const words = text.split(' ');
              let currentLine = '';

              words.forEach(word => {
                if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
                  currentLine = currentLine ? currentLine + ' ' + word : word;
                } else {
                  if (currentLine) wrappedLines.push(currentLine);
                  currentLine = word;
                }
              });

              if (currentLine) wrappedLines.push(currentLine);

              const maxLines = Math.floor(node.height / (fontSize * 1.2)) - 1;
              if (wrappedLines.length > maxLines && maxLines > 0) {
                wrappedLines = wrappedLines.slice(0, maxLines);
                if (wrappedLines.length > 0) {
                  const lastLine = wrappedLines[wrappedLines.length - 1];
                  if (lastLine.length > 3) {
                    wrappedLines[wrappedLines.length - 1] = lastLine.substring(0, lastLine.length - 3) + '...';
                  }
                }
              }
            }

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
                {showText && wrappedLines.length > 0 && (
                  <>
                    <text
                      x={node.x + node.width / 2}
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
                      {wrappedLines.map((line, i) => (
                        <tspan
                          key={i}
                          x={node.x + node.width / 2}
                          y={node.y + node.height / 2 - (wrappedLines.length * fontSize * 1.2) / 2 + i * fontSize * 1.2 + fontSize * 0.8}
                        >
                          {line}
                        </tspan>
                      ))}
                    </text>
                    <text
                      x={node.x + node.width / 2}
                      y={node.y + node.height / 2 + (wrappedLines.length * fontSize * 1.2) / 2 + fontSize * 0.9}
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

      {hoveredIndex !== null && nodes[hoveredIndex] && (
        <div className={`mt-4 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}>
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
