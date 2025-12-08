import { TrendingTopic } from '../types';
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface DonutChartProps {
  topics: TrendingTopic[];
  maxDisplay?: number;
  theme: 'dark' | 'light';
  useCryptoColors?: boolean;
  cryptoTimeframe?: '1h' | '24h' | '7d' | '30d' | '1y';
}

export default function DonutChart({
  topics,
  maxDisplay = 20,
  theme,
  useCryptoColors = false,
  cryptoTimeframe = '24h'
}: DonutChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  const getCryptoValue = (topic: TrendingTopic): number => {
    if (!topic.crypto_data || !useCryptoColors) return topic.searchVolume;

    const timeframeMap = {
      '1h': topic.crypto_data.change_1h,
      '24h': topic.crypto_data.change_24h,
      '7d': topic.crypto_data.change_7d,
      '30d': topic.crypto_data.change_30d,
      '1y': topic.crypto_data.change_1y,
    };

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
    };

    return timeframeMap[cryptoTimeframe] || topic.searchVolumeRaw;
  };

  const getCryptoChange = (topic: TrendingTopic): number => {
    if (!topic.crypto_data) return 0;
    const timeframeMap = {
      '1h': 'change_1h',
      '24h': 'change_24h',
      '7d': 'change_7d',
      '30d': 'change_30d',
      '1y': 'change_1y',
    };
    const field = timeframeMap[cryptoTimeframe] as keyof typeof topic.crypto_data;
    return topic.crypto_data[field] || 0;
  };

  const getSliceColor = (topic: TrendingTopic, index: number) => {
    if (useCryptoColors && topic.crypto_data) {
      const change = getCryptoChange(topic);
      if (change > 0) return theme === 'dark' ? '#10b981' : '#059669';
      if (change < 0) return theme === 'dark' ? '#ef4444' : '#dc2626';
      return theme === 'dark' ? '#6b7280' : '#9ca3af';
    }

    const hue = (index * 360) / maxDisplay;
    return theme === 'dark'
      ? `hsl(${hue}, 70%, 60%)`
      : `hsl(${hue}, 70%, 50%)`;
  };

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    const displayTopics = topics.slice(0, maxDisplay);
    const data = displayTopics.map(topic => getCryptoValue(topic));

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const isMobile = dimensions.width < 768;
    const radius = Math.min(dimensions.width, dimensions.height) / 2 - (isMobile ? 40 : 60);
    const innerRadius = radius * 0.6;

    const g = svg
      .append('g')
      .attr('transform', `translate(${dimensions.width / 2}, ${dimensions.height / 2})`);

    const pie = d3.pie<number>()
      .value(d => d)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<number>>()
      .innerRadius(innerRadius)
      .outerRadius(radius);

    const arcHover = d3.arc<d3.PieArcDatum<number>>()
      .innerRadius(innerRadius)
      .outerRadius(radius + 10);

    const arcs = g
      .selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    arcs
      .append('path')
      .attr('d', arc)
      .attr('fill', (d, i) => getSliceColor(displayTopics[i], i))
      .attr('stroke', theme === 'dark' ? '#1f2937' : '#ffffff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.3s ease')
      .on('mouseenter', function(event, d) {
        setHoveredIndex(d.index);
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arcHover);
      })
      .on('mouseleave', function() {
        setHoveredIndex(null);
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc);
      })
      .transition()
      .duration(1000)
      .attrTween('d', function(d) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function(t) {
          return arc(interpolate(t)) || '';
        };
      });

    if (!isMobile) {
      arcs
        .append('text')
        .attr('transform', d => {
          const pos = arc.centroid(d);
          return `translate(${pos[0]}, ${pos[1]})`;
        })
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', theme === 'dark' ? '#ffffff' : '#000000')
        .attr('font-weight', 'bold')
        .style('pointer-events', 'none')
        .text((d, i) => {
          const percentage = ((d.endAngle - d.startAngle) / (2 * Math.PI)) * 100;
          return percentage > 5 ? `${percentage.toFixed(1)}%` : '';
        })
        .style('opacity', 0)
        .transition()
        .delay(1000)
        .duration(500)
        .style('opacity', 1);
    }

    const centerText = g.append('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', isMobile ? '14px' : '18px')
      .attr('font-weight', 'bold')
      .attr('fill', theme === 'dark' ? '#9ca3af' : '#4b5563')
      .text(`Total: ${displayTopics.length}`);

  }, [topics, dimensions, theme, maxDisplay, useCryptoColors, cryptoTimeframe]);

  const displayTopics = topics.slice(0, maxDisplay);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-4`}
      style={{ minHeight: '800px' }}
    >
      <div className="flex flex-col md:flex-row gap-4 h-full">
        <div className="flex-1 min-h-[600px]">
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ minHeight: '600px' }}
          />
        </div>

        <div className="w-full md:w-64 overflow-y-auto max-h-[700px] pr-2">
          <div className="space-y-2">
            {displayTopics.map((topic, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 p-2 rounded transition-all ${
                  hoveredIndex === index
                    ? theme === 'dark'
                      ? 'bg-gray-800 scale-105'
                      : 'bg-gray-200 scale-105'
                    : theme === 'dark'
                    ? 'bg-gray-800/50'
                    : 'bg-gray-100'
                }`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div
                  className="w-4 h-4 rounded flex-shrink-0"
                  style={{ backgroundColor: getSliceColor(topic, index) }}
                />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                    {topic.name.replace(/"/g, '')}
                  </div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {getCryptoDisplayText(topic)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
