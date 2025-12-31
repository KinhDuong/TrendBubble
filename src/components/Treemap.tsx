import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TrendingTopic, CryptoTimeframe } from '../types';
import BubbleTooltip from './BubbleTooltip';
import { formatCompactNumber } from '../utils/formatNumber';

interface KeywordPerformanceData {
  keyword: string;
  three_month_change?: number;
  yoy_change?: number;
  monthly_searches?: number[];
  bid_high?: number;
  competition?: string | number;
  searchVolume?: number;
  ai_insights?: string;
  sentiment?: number;
}

interface TreemapProps {
  topics: TrendingTopic[];
  maxDisplay: number;
  theme: 'dark' | 'light';
  useCryptoColors?: boolean;
  cryptoTimeframe?: CryptoTimeframe;
  keywordPerformanceData?: KeywordPerformanceData[];
}

interface TreeNode {
  name: string;
  value: number;
  topic: TrendingTopic;
}

interface TooltipData {
  topic: TrendingTopic;
  x: number;
  y: number;
  rank: number;
}

export default function Treemap({ topics, maxDisplay, theme, useCryptoColors = false, cryptoTimeframe = '1h', keywordPerformanceData = [] }: TreemapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [pinnedTopics, setPinnedTopics] = useState<Set<string>>(new Set());
  const [comparingTopics, setComparingTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || topics.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const displayTopics = topics.slice(0, maxDisplay);

    const getCryptoValue = (topic: TrendingTopic): number => {
      if (!topic.crypto_data || !useCryptoColors) return topic.searchVolume;

      const timeframeMap = {
        '1h': topic.crypto_data.change_1h,
        '24h': topic.crypto_data.change_24h,
        '7d': topic.crypto_data.change_7d,
        '30d': topic.crypto_data.change_30d,
        '1y': topic.crypto_data.change_1y,
      } as const;

      return Math.abs(timeframeMap[cryptoTimeframe] || 0);
    };

    const getCryptoDisplayText = (topic: TrendingTopic): string => {
      if (!topic.crypto_data || !useCryptoColors) return topic.searchVolumeRaw;

      const timeframeMap = {
        '1h': topic.crypto_data.formatted.change_1h,
        '24h': topic.crypto_data.formatted.change_24h,
        '7d': topic.crypto_data.formatted.change_7d,
        '30d': topic.crypto_data.formatted.change_30d,
        '1y': topic.crypto_data.formatted.change_1y,
      } as const;

      return timeframeMap[cryptoTimeframe] || topic.searchVolumeRaw;
    };

    const hierarchyData = {
      name: 'root',
      children: displayTopics.map(topic => ({
        name: topic.name,
        value: getCryptoValue(topic),
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
        const rank = displayTopics.findIndex(t => t.name === nodeData.topic.name) + 1;
        setTooltipData({
          topic: nodeData.topic,
          x: rect.left + rect.width / 2,
          y: rect.top,
          rank: rank
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

        return getCryptoDisplayText(nodeData.topic).replace(/"/g, '');
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

  const displayTopics = topics.slice(0, maxDisplay);

  const handleTogglePin = (topicName: string) => {
    setPinnedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topicName)) {
        newSet.delete(topicName);
      } else {
        newSet.add(topicName);
      }
      return newSet;
    });
  };

  const handleToggleCompare = (topicName: string) => {
    setComparingTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topicName)) {
        newSet.delete(topicName);
      } else {
        newSet.add(topicName);
      }
      return newSet;
    });
  };

  const generateAriaLabel = () => {
    const topicCount = displayTopics.length;
    const topTopic = displayTopics[0]?.name || 'trending topics';
    const category = displayTopics[0]?.category || 'various categories';

    if (useCryptoColors) {
      return `Treemap visualization displaying ${topicCount} cryptocurrencies by ${cryptoTimeframe} price change magnitude, with ${topTopic} as the largest block`;
    }

    return `Treemap visualization showing ${topicCount} trending topics in ${category}, with ${topTopic} having the largest area representing highest search volume`;
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg
        ref={svgRef}
        className="w-full h-full"
        aria-label={generateAriaLabel()}
        title={useCryptoColors ? `Cryptocurrency treemap - ${cryptoTimeframe} timeframe` : 'Trending topics treemap - Click tiles for details'}
        role="img"
      />
      {tooltipData && (
        <BubbleTooltip
          topic={tooltipData.topic}
          x={tooltipData.x}
          y={tooltipData.y}
          rank={tooltipData.rank}
          theme={theme}
          isPinned={pinnedTopics.has(tooltipData.topic.name)}
          onTogglePin={() => handleTogglePin(tooltipData.topic.name)}
          onCompare={() => handleToggleCompare(tooltipData.topic.name)}
          isComparing={comparingTopics.has(tooltipData.topic.name)}
          onClose={() => setTooltipData(null)}
          cryptoTimeframe={cryptoTimeframe}
          keywordData={keywordPerformanceData.find(kw => kw.keyword === tooltipData.topic.name)}
        />
      )}
    </div>
  );
}
