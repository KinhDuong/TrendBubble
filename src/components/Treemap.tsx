import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TrendingTopic, CryptoTimeframe } from '../types';

interface TreemapProps {
  topics: TrendingTopic[];
  maxDisplay: number;
  theme: 'dark' | 'light';
  useCryptoColors?: boolean;
  cryptoTimeframe?: CryptoTimeframe;
}

interface TreeNode {
  name: string;
  value: number;
  topic: TrendingTopic;
}

export default function Treemap({ topics, maxDisplay, theme, useCryptoColors = false, cryptoTimeframe = '1h' }: TreemapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ topic: TrendingTopic; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || topics.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const displayTopics = topics.slice(0, maxDisplay);

    const hierarchyData = {
      name: 'root',
      children: displayTopics.map(topic => ({
        name: topic.name,
        value: topic.searchVolume,
        topic: topic
      }))
    };

    const root = d3.hierarchy<TreeNode | { name: string; children: TreeNode[] }>(hierarchyData)
      .sum(d => ('value' in d) ? d.value : 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    d3.treemap<TreeNode | { name: string; children: TreeNode[] }>()
      .size([width, height])
      .padding(2)
      .round(true)(root);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('font-family', 'sans-serif');

    const getCryptoColor = (topic: TrendingTopic): string => {
      if (!topic.crypto_data || !useCryptoColors) return '';

      const timeframeMap = {
        '1h': 'change_1h',
        '24h': 'change_24h',
        '7d': 'change_7d',
        '30d': 'change_30d',
        '1y': 'change_1y',
      } as const;

      const fieldName = timeframeMap[cryptoTimeframe];
      const percentChange = topic.crypto_data[fieldName] || 0;

      if (percentChange >= 5) return '#0D7C4E';
      if (percentChange >= 2) return '#16A34A';
      if (percentChange >= 0) return '#22C55E';
      if (percentChange >= -2) return '#DC2626';
      if (percentChange >= -5) return '#B91C1C';
      return '#7F1D1D';
    };

    const colors = [
      '#3B82F6', '#10B981', '#EAB308', '#EF4444',
      '#EC4899', '#14B8A6', '#F97316', '#06B6D4',
      '#8B5CF6', '#84CC16', '#F59E0B', '#6366F1'
    ];

    const color = d3.scaleOrdinal<number, string>()
      .domain(d3.range(displayTopics.length))
      .range(colors);

    const leaf = svg.selectAll('g')
      .data(root.leaves())
      .join('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    leaf.append('rect')
      .attr('id', (d, i) => `rect-${i}`)
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', (d, i) => {
        const nodeData = d.data as TreeNode;
        if (useCryptoColors) {
          const cryptoColor = getCryptoColor(nodeData.topic);
          return cryptoColor || color(i);
        }
        return color(i);
      })
      .attr('fill-opacity', theme === 'dark' ? 0.8 : 0.9)
      .attr('stroke', theme === 'dark' ? '#1F2937' : '#E5E7EB')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('fill-opacity', 1)
          .attr('stroke-width', 3)
          .attr('stroke', theme === 'dark' ? '#FFFFFF' : '#000000');
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('fill-opacity', theme === 'dark' ? 0.8 : 0.9)
          .attr('stroke-width', 2)
          .attr('stroke', theme === 'dark' ? '#1F2937' : '#E5E7EB');
      })
      .on('click', function(event, d) {
        const nodeData = d.data as TreeNode;
        const rect = (event.target as SVGRectElement).getBoundingClientRect();
        setTooltip({
          topic: nodeData.topic,
          x: rect.left + rect.width / 2,
          y: rect.top
        });
      });

    leaf.append('clipPath')
      .attr('id', (d, i) => `clip-${i}`)
      .append('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0);

    leaf.append('text')
      .attr('clip-path', (d, i) => `url(#clip-${i})`)
      .selectAll('tspan')
      .data(d => {
        const nodeData = d.data as TreeNode;
        const name = nodeData.name.replace(/"/g, '');
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;

        if (width < 30 || height < 30) return [];

        const words = name.split(/\s+/);
        const lines: string[] = [];
        let currentLine = '';
        const maxCharsPerLine = Math.floor(width / 8);

        words.forEach(word => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (testLine.length <= maxCharsPerLine) {
            currentLine = testLine;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        });
        if (currentLine) lines.push(currentLine);

        return lines.slice(0, Math.floor(height / 16));
      })
      .join('tspan')
      .attr('x', 4)
      .attr('y', (d, i, nodes) => {
        const lineHeight = 14;
        const startY = 14;
        return startY + i * lineHeight;
      })
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#FFFFFF')
      .text(d => d);

    leaf.append('text')
      .attr('clip-path', (d, i) => `url(#clip-${i})`)
      .attr('x', 4)
      .attr('y', d => {
        const nodeData = d.data as TreeNode;
        const name = nodeData.name.replace(/"/g, '');
        const height = d.y1 - d.y0;
        const width = d.x1 - d.x0;

        if (width < 30 || height < 40) return -100;

        const words = name.split(/\s+/);
        const maxCharsPerLine = Math.floor(width / 8);
        let lineCount = 0;
        let currentLine = '';

        words.forEach(word => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (testLine.length <= maxCharsPerLine) {
            currentLine = testLine;
          } else {
            lineCount++;
            currentLine = word;
          }
        });
        if (currentLine) lineCount++;

        return 14 + (lineCount * 14) + 8;
      })
      .attr('font-size', '9px')
      .attr('fill', theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.9)')
      .text(d => {
        const nodeData = d.data as TreeNode;
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;

        if (width < 30 || height < 40) return '';

        return nodeData.topic.searchVolumeRaw.replace(/"/g, '');
      });

    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;

      if (newWidth !== width || newHeight !== height) {
        svg.selectAll('*').remove();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);

  }, [topics, maxDisplay, theme, useCryptoColors, cryptoTimeframe]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg ref={svgRef} className="w-full h-full" />
      {tooltip && (
        <div
          className={`fixed z-50 px-4 py-3 rounded-lg shadow-xl max-w-sm ${
            theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y - 10}px`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none'
          }}
        >
          <button
            className={`absolute top-2 right-2 p-1 rounded ${
              theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
            style={{ pointerEvents: 'auto' }}
            onClick={() => setTooltip(null)}
          >
            ×
          </button>
          <h3 className="font-bold text-lg mb-2">{tooltip.topic.name.replace(/"/g, '')}</h3>
          <p className="text-sm mb-1">
            <span className="font-medium">Search Volume:</span> {tooltip.topic.searchVolumeRaw.replace(/"/g, '')}
          </p>
          {tooltip.topic.category && (
            <p className="text-sm mb-1">
              <span className="font-medium">Category:</span> {tooltip.topic.category}
            </p>
          )}
          {tooltip.topic.source && (
            <p className="text-sm mb-1">
              <span className="font-medium">Source:</span> {tooltip.topic.source}
            </p>
          )}
          {tooltip.topic.url && (
            <a
              href={tooltip.topic.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 text-sm block mt-2"
              style={{ pointerEvents: 'auto' }}
            >
              View Details →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
