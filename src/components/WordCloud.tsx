import React, { useMemo, useState, useEffect, useRef } from 'react';
import { formatCompactNumber } from '../utils/formatNumber';

interface KeywordData {
  keyword: string;
  searchVolume: number;
  cpcLow?: number;
  cpcHigh?: number;
  isBranded?: boolean;
}

interface WordCloudProps {
  data: KeywordData[];
  maxWords?: number;
  colorScheme?: 'default' | 'brand' | 'gradient' | 'mono';
  brandColor?: string;
  onWordClick?: (keyword: KeywordData) => void;
  className?: string;
}

interface WordItem {
  text: string;
  size: number;
  volume: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  data: KeywordData;
}

const WordCloud: React.FC<WordCloudProps> = ({
  data,
  maxWords = 100,
  colorScheme = 'default',
  brandColor = '#3b82f6',
  onWordClick,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(width, 400), height: Math.max(height, 400) });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const words = useMemo(() => {
    if (!data || data.length === 0) return [];

    const sortedData = [...data]
      .sort((a, b) => b.searchVolume - a.searchVolume)
      .slice(0, maxWords);

    const maxVolume = sortedData[0]?.searchVolume || 1;
    const minVolume = sortedData[sortedData.length - 1]?.searchVolume || 1;

    const getColor = (index: number, isBranded: boolean): string => {
      if (colorScheme === 'mono') {
        const opacity = 0.4 + (index / sortedData.length) * 0.6;
        return `rgba(100, 100, 100, ${opacity})`;
      }

      if (colorScheme === 'brand') {
        const opacity = 0.5 + (index / sortedData.length) * 0.5;
        const hex = brandColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }

      if (colorScheme === 'gradient') {
        const hue = (index / sortedData.length) * 360;
        return `hsl(${hue}, 70%, 50%)`;
      }

      if (isBranded) {
        return brandColor;
      }

      const colors = [
        '#3b82f6',
        '#8b5cf6',
        '#ec4899',
        '#f59e0b',
        '#10b981',
        '#06b6d4',
        '#6366f1',
        '#f43f5e'
      ];
      return colors[index % colors.length];
    };

    const wordItems: WordItem[] = [];
    const spiral = (angle: number) => {
      const radius = angle * 2;
      return {
        x: dimensions.width / 2 + radius * Math.cos(angle),
        y: dimensions.height / 2 + radius * Math.sin(angle)
      };
    };

    let angle = 0;
    const angleStep = 0.5;

    sortedData.forEach((item, index) => {
      const normalizedSize = Math.log(item.searchVolume + 1) / Math.log(maxVolume + 1);
      const fontSize = 12 + normalizedSize * 60;

      const position = spiral(angle);
      angle += angleStep;

      const rotation = Math.random() > 0.85 ? (Math.random() > 0.5 ? -45 : 45) : 0;

      wordItems.push({
        text: item.keyword,
        size: fontSize,
        volume: item.searchVolume,
        x: position.x,
        y: position.y,
        rotation,
        color: getColor(index, item.isBranded || false),
        data: item
      });
    });

    return wordItems;
  }, [data, maxWords, dimensions, colorScheme, brandColor]);

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 bg-gray-50 rounded-lg ${className}`}>
        <p className="text-gray-500">No data available for word cloud</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative w-full h-[600px] bg-white rounded-lg overflow-hidden ${className}`}>
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
        style={{ cursor: onWordClick ? 'pointer' : 'default' }}
      >
        {words.map((word, index) => (
          <text
            key={`${word.text}-${index}`}
            x={word.x}
            y={word.y}
            fontSize={word.size}
            fill={hoveredWord === word.text ? '#000' : word.color}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${word.rotation} ${word.x} ${word.y})`}
            className="transition-all duration-200 select-none"
            style={{
              fontWeight: hoveredWord === word.text ? 700 : 600,
              opacity: hoveredWord === word.text ? 1 : 0.85,
              cursor: onWordClick ? 'pointer' : 'default'
            }}
            onMouseEnter={() => setHoveredWord(word.text)}
            onMouseLeave={() => setHoveredWord(null)}
            onClick={() => onWordClick?.(word.data)}
          >
            {word.text}
          </text>
        ))}
      </svg>

      {hoveredWord && (
        <div
          className="absolute bottom-4 left-4 bg-white/95 px-4 py-2 rounded-lg shadow-lg border border-gray-200"
          style={{ pointerEvents: 'none' }}
        >
          <p className="text-sm font-semibold text-gray-900">
            {hoveredWord}
          </p>
          <p className="text-xs text-gray-600">
            Search Volume: {formatCompactNumber(words.find(w => w.text === hoveredWord)?.volume || 0)}
          </p>
        </div>
      )}
    </div>
  );
};

export default WordCloud;
