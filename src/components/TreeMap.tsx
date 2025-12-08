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

export default function TreeMap({ topics, maxDisplay = 50, theme }: TreeMapProps) {
  const [nodes, setNodes] = useState<TreeMapNode[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const displayTopics = topics.slice(0, maxDisplay);
    const totalValue = displayTopics.reduce((sum, t) => sum + t.searchVolume, 0);

    const containerWidth = 1200;
    const containerHeight = 800;

    const calculatedNodes: TreeMapNode[] = [];
    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;
    let rowWidth = 0;
    const padding = 2;

    displayTopics.forEach((topic, index) => {
      const area = (topic.searchVolume / totalValue) * (containerWidth * containerHeight);
      const aspectRatio = containerWidth / containerHeight;

      let width = Math.sqrt(area * aspectRatio);
      let height = area / width;

      if (currentX + width > containerWidth) {
        currentX = 0;
        currentY += rowHeight + padding;
        rowHeight = 0;
        rowWidth = 0;
      }

      if (currentY + height > containerHeight) {
        height = containerHeight - currentY;
        width = area / height;
      }

      const hue = (index * 360) / maxDisplay;
      const color = theme === 'dark'
        ? `hsl(${hue}, 70%, 60%)`
        : `hsl(${hue}, 70%, 50%)`;

      calculatedNodes.push({
        topic,
        x: currentX,
        y: currentY,
        width: width - padding,
        height: height - padding,
        color
      });

      currentX += width;
      rowWidth += width;
      rowHeight = Math.max(rowHeight, height);
    });

    setNodes(calculatedNodes);
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
                {showText && (
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
