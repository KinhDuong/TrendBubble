import React, { useMemo, useState, useEffect, useRef } from 'react';
import cloud from 'd3-cloud';
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

interface CloudWord {
  text: string;
  size: number;
  x?: number;
  y?: number;
  rotate?: number;
  volume: number;
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
  const [words, setWords] = useState<CloudWord[]>([]);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        const height = Math.min(width * 0.65, 650);
        setDimensions({ width: Math.max(width, 400), height: Math.max(height, 400) });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!data || data.length === 0) {
      setWords([]);
      return;
    }

    const validData = data.filter(item => item && item.keyword && item.searchVolume > 0);
    if (validData.length === 0) {
      setWords([]);
      return;
    }

    const sortedData = [...validData]
      .sort((a, b) => b.searchVolume - a.searchVolume)
      .slice(0, maxWords);

    const maxVolume = sortedData[0]?.searchVolume || 1;

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

    const cloudWords: CloudWord[] = sortedData.map((item, index) => {
      const normalizedSize = Math.sqrt(item.searchVolume) / Math.sqrt(maxVolume);
      const fontSize = 16 + normalizedSize * 72;

      return {
        text: item.keyword,
        size: fontSize,
        volume: item.searchVolume,
        color: getColor(index, item.isBranded || false),
        data: item
      };
    });

    // Custom elliptical spiral function
    const ellipticalSpiral = (size: [number, number]) => {
      const e = size[0] / size[1]; // ellipse ratio

      return (t: number) => {
        const dt = 4;
        const dy = 12;
        const dx = dy * e;

        t += 1;
        const angle = t * dt;
        return [
          e * (dy * t) * Math.cos(angle),
          (dy * t) * Math.sin(angle)
        ];
      };
    };

    const layout = cloud()
      .size([dimensions.width, dimensions.height])
      .words(cloudWords as any)
      .padding(6)
      .rotate(() => 0)
      .font('system-ui, -apple-system, sans-serif')
      .fontSize(d => (d as CloudWord).size)
      .spiral(ellipticalSpiral)
      .timeInterval(10)
      .on('end', (computedWords) => {
        setWords(computedWords as CloudWord[]);
      });

    layout.start();
  }, [data, maxWords, dimensions, colorScheme, brandColor]);

  const hasData = data && data.length > 0 && data.some(item => item && item.keyword && item.searchVolume > 0);

  if (!hasData) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] h-[500px] rounded-lg ${className}`}>
        <div className="text-center">
          <p className="text-gray-500 text-lg font-medium">No keywords available</p>
          <p className="text-gray-400 text-sm mt-2">Please select a different filter or add keyword data</p>
        </div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] h-[500px] rounded-lg ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500 text-sm mt-4">Generating word cloud...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative w-full min-h-[400px] h-[500px] rounded-lg overflow-hidden border bg-white ${className}`}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        <g transform={`translate(${dimensions.width / 2},${dimensions.height / 2})`}>
          {words.map((word, index) => (
            <text
              key={`${word.text}-${index}`}
              x={word.x || 0}
              y={word.y || 0}
              fontSize={word.size}
              fill={hoveredWord === word.text ? '#000' : word.color}
              textAnchor="middle"
              transform={`rotate(${word.rotate || 0})`}
              className="transition-all duration-200 select-none"
              style={{
                fontWeight: hoveredWord === word.text ? 700 : 600,
                opacity: hoveredWord === word.text ? 1 : 0.85,
                cursor: onWordClick ? 'pointer' : 'default',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
              onMouseEnter={() => setHoveredWord(word.text)}
              onMouseLeave={() => setHoveredWord(null)}
              onClick={() => onWordClick?.(word.data)}
            >
              {word.text}
            </text>
          ))}
        </g>
      </svg>

      {hoveredWord && (
        <div
          className="absolute bottom-4 left-4 bg-gray-900/95 px-4 py-3 rounded-lg shadow-xl border border-gray-700 backdrop-blur-sm"
          style={{ pointerEvents: 'none' }}
        >
          <p className="text-sm font-bold text-white">
            {hoveredWord}
          </p>
          <p className="text-xs text-gray-300 mt-1">
            Search Volume: {formatCompactNumber(words.find(w => w.text === hoveredWord)?.volume || 0)}
          </p>
        </div>
      )}
    </div>
  );
};

export default WordCloud;
