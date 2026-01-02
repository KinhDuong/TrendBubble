import React, { useMemo, useState, useEffect, useRef } from 'react';
import cloud from 'd3-cloud';
import { formatCompactNumber } from '../utils/formatNumber';
import BubbleTooltip from './BubbleTooltip';
import { TrendingTopic } from '../types';

interface KeywordData {
  keyword: string;
  searchVolume: number;
  cpcLow?: number;
  cpcHigh?: number;
  isBranded?: boolean;
  brandColor?: string;
  three_month_change?: number;
  yoy_change?: number;
  monthly_searches?: number[];
  bid_high?: number;
  competition?: string | number;
  competition_indexed?: number;
  ai_insights?: string;
  sentiment?: number;
  search_variants?: string;
}

interface WordCloudProps {
  data: KeywordData[];
  maxWords?: number;
  colorScheme?: 'default' | 'brand' | 'gradient' | 'mono';
  brandColor?: string;
  onWordClick?: (keyword: KeywordData) => void;
  className?: string;
  useMultiBrandColors?: boolean;
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
  className = '',
  useMultiBrandColors = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 500 });
  const [words, setWords] = useState<CloudWord[]>([]);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<{ word: CloudWord; x: number; y: number; rank: number } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        const height = Math.min(width * 0.42, 700);
        setDimensions({ width: Math.max(width, 600), height: Math.max(height, 500) });
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
      const fontSize = 12 + normalizedSize * 48;

      return {
        text: item.keyword,
        size: fontSize,
        volume: item.searchVolume,
        color: (useMultiBrandColors && item.brandColor) ? item.brandColor : getColor(index, item.isBranded || false),
        data: item
      };
    });

    // Custom elliptical spiral function for pronounced oval shape
    const ellipticalSpiral = (size: [number, number]) => {
      const horizontalStretch = 2.4; // Makes it wider (oval)
      const verticalCompress = 0.55; // Makes it less tall

      return (t: number) => {
        const angle = t * 0.1;
        const radius = t * 3;
        return [
          radius * Math.cos(angle) * horizontalStretch,
          radius * Math.sin(angle) * verticalCompress
        ];
      };
    };

    const layout = cloud()
      .size([dimensions.width, dimensions.height])
      .words(cloudWords as any)
      .padding(3)
      .rotate(() => 0)
      .font('system-ui, -apple-system, sans-serif')
      .fontSize(d => (d as CloudWord).size)
      .spiral(ellipticalSpiral)
      .timeInterval(50)
      .on('end', (computedWords) => {
        setWords(computedWords as CloudWord[]);
      });

    layout.start();
  }, [data, maxWords, dimensions, colorScheme, brandColor]);

  const hasData = data && data.length > 0 && data.some(item => item && item.keyword && item.searchVolume > 0);

  if (!hasData) {
    return (
      <div className={`flex items-center justify-center min-h-[500px] h-[600px] rounded-lg ${className}`}>
        <div className="text-center">
          <p className="text-gray-500 text-lg font-medium">No keywords available</p>
          <p className="text-gray-400 text-sm mt-2">Please select a different filter or add keyword data</p>
        </div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-[500px] h-[600px] rounded-lg ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500 text-sm mt-4">Generating word cloud...</p>
        </div>
      </div>
    );
  }

  const handleWordClick = (word: CloudWord, event: React.MouseEvent, rank: number) => {
    event.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setSelectedWord({
        word,
        x: event.clientX,
        y: event.clientY,
        rank
      });
    }
    onWordClick?.(word.data);
  };

  const convertToTrendingTopic = (word: CloudWord, rank: number): TrendingTopic => {
    return {
      id: word.text,
      name: word.text,
      searchVolume: word.volume,
      searchVolumeRaw: word.volume.toString(),
      rank,
      source: 'user_upload',
      category: null,
      url: null,
      note: null,
      pub_date: null,
      created_at: new Date().toISOString(),
      user_id: null,
      brandColor: word.data.brandColor,
      monthlySearches: word.data.monthly_searches?.map((vol, idx) => ({
        month: new Date(new Date().setMonth(new Date().getMonth() - idx)).toISOString().slice(0, 7),
        volume: vol
      }))
    };
  };

  return (
    <div ref={containerRef} className={`relative w-full min-h-[500px] h-[600px] rounded-lg overflow-hidden border ${className}`}>
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
              fill={hoveredWord === word.text ? (isDarkMode ? '#fff' : '#000') : word.color}
              textAnchor="middle"
              transform={`rotate(${word.rotate || 0})`}
              className="transition-all duration-200 select-none"
              style={{
                fontWeight: hoveredWord === word.text ? 700 : 600,
                opacity: hoveredWord === word.text ? 1 : 0.85,
                cursor: 'pointer',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
              onMouseEnter={() => setHoveredWord(word.text)}
              onMouseLeave={() => setHoveredWord(null)}
              onClick={(e) => handleWordClick(word, e, index + 1)}
            >
              {word.text}
            </text>
          ))}
        </g>
      </svg>

      {hoveredWord && !selectedWord && (
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

      {selectedWord && (
        <BubbleTooltip
          topic={convertToTrendingTopic(selectedWord.word, selectedWord.rank)}
          x={selectedWord.x}
          y={selectedWord.y}
          rank={selectedWord.rank}
          theme={isDarkMode ? 'dark' : 'light'}
          isPinned={false}
          onTogglePin={() => {}}
          onCompare={() => {}}
          isComparing={false}
          onClose={() => setSelectedWord(null)}
          keywordData={{
            keyword: selectedWord.word.text,
            searchVolume: selectedWord.word.volume,
            three_month_change: selectedWord.word.data.three_month_change,
            yoy_change: selectedWord.word.data.yoy_change,
            monthly_searches: selectedWord.word.data.monthly_searches,
            bid_high: selectedWord.word.data.bid_high,
            competition: selectedWord.word.data.competition,
            competition_indexed: selectedWord.word.data.competition_indexed,
            ai_insights: selectedWord.word.data.ai_insights,
            sentiment: selectedWord.word.data.sentiment,
            search_variants: selectedWord.word.data.search_variants
          }}
        />
      )}
    </div>
  );
};

export default WordCloud;
