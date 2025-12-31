import { TrendingTopic } from '../types';
import { useEffect, useRef, useState } from 'react';
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

interface BarChartProps {
  topics: TrendingTopic[];
  maxDisplay?: number;
  theme: 'dark' | 'light';
  useCryptoColors?: boolean;
  cryptoTimeframe?: '1h' | '24h' | '7d' | '30d' | '1y';
  keywordPerformanceData?: KeywordPerformanceData[];
}

interface TooltipData {
  topic: TrendingTopic;
  x: number;
  y: number;
  rank: number;
}

export default function BarChart({
  topics,
  maxDisplay = 20,
  theme,
  useCryptoColors = false,
  cryptoTimeframe = '24h',
  keywordPerformanceData = []
}: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [animate, setAnimate] = useState(false);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [pinnedTopics, setPinnedTopics] = useState<Set<string>>(new Set());
  const [comparingTopics, setComparingTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    setAnimate(false);
    const timer = setTimeout(() => {
      setAnimate(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [topics]);

  const displayTopics = topics.slice(0, maxDisplay);

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

  const maxValue = Math.max(...displayTopics.map(t => getCryptoValue(t)));

  const generateAriaLabel = () => {
    const topicCount = displayTopics.length;
    const topTopic = displayTopics[0]?.name || 'trending topics';
    const category = displayTopics[0]?.category || 'various categories';

    if (useCryptoColors) {
      return `Bar chart displaying ${topicCount} cryptocurrencies ranked by ${cryptoTimeframe} price change, with ${topTopic} as the top trending cryptocurrency`;
    }

    return `Bar chart showing ${topicCount} trending topics in ${category}, with ${topTopic} having the highest search volume`;
  };

  const getBarColor = (topic: TrendingTopic, index: number) => {
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

  const handleBarClick = (event: React.MouseEvent, topic: TrendingTopic, rank: number) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipData({
      topic,
      x: rect.left + rect.width / 2,
      y: rect.top,
      rank
    });
  };

  return (
    <div
      ref={containerRef}
      className={`w-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-2 md:p-6`}
      style={{ minHeight: '600px' }}
      role="img"
      aria-label={generateAriaLabel()}
      title={useCryptoColors ? `Cryptocurrency trends - ${cryptoTimeframe} timeframe` : 'Trending topics ranked by search volume'}
    >
      <div className="space-y-2 md:space-y-3">
        {displayTopics.map((topic, index) => {
          const barWidth = (getCryptoValue(topic) / maxValue) * 100;
          const barColor = getBarColor(topic, index);
          const displayText = getCryptoDisplayText(topic);

          return (
            <div key={index}>
              {/* Mobile: Compact layout */}
              <div className="md:hidden">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium truncate overflow-hidden flex-shrink-0 w-20 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                    {topic.name.replace(/"/g, '')}
                  </span>
                  <div
                    className={`flex-1 h-8 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} overflow-hidden relative cursor-pointer hover:opacity-80 transition-opacity`}
                    onClick={(e) => handleBarClick(e, topic, index + 1)}
                  >
                    <div
                      className="h-full transition-all duration-1000 ease-out"
                      style={{
                        width: animate ? `${barWidth}%` : '0%',
                        backgroundColor: barColor
                      }}
                    />
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 w-16 text-right ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {displayText.replace(/"/g, '')}
                  </span>
                </div>
              </div>

              {/* Desktop: Clean horizontal layout with fixed columns */}
              <div className="hidden md:block">
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-medium flex-shrink-0 w-64 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`} style={{ overflow: 'visible', whiteSpace: 'normal', lineHeight: '1.2' }}>
                    {topic.name.replace(/"/g, '')}
                  </span>
                  <div
                    className={`flex-1 h-10 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} overflow-hidden relative cursor-pointer hover:opacity-80 transition-opacity`}
                    onClick={(e) => handleBarClick(e, topic, index + 1)}
                  >
                    <div
                      className="h-full transition-all duration-1000 ease-out"
                      style={{
                        width: animate ? `${barWidth}%` : '0%',
                        backgroundColor: barColor
                      }}
                    />
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 w-24 text-right ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {displayText.replace(/"/g, '')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
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
