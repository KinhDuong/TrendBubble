import { TrendingTopic } from '../types';
import { useEffect, useRef, useState } from 'react';

interface BarChartProps {
  topics: TrendingTopic[];
  maxDisplay?: number;
  theme: 'dark' | 'light';
  useCryptoColors?: boolean;
  cryptoTimeframe?: '1h' | '24h' | '7d' | '30d' | '1y';
}

export default function BarChart({
  topics,
  maxDisplay = 20,
  theme,
  useCryptoColors = false,
  cryptoTimeframe = '24h'
}: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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

  const displayTopics = topics.slice(0, maxDisplay);
  const maxValue = Math.max(...displayTopics.map(t => t.searchVolume));

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

  return (
    <div
      ref={containerRef}
      className={`w-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-4 md:p-6`}
      style={{ minHeight: '600px' }}
    >
      <div className="space-y-3">
        {displayTopics.map((topic, index) => {
          const barWidth = (topic.searchVolume / maxValue) * 100;
          const barColor = getBarColor(topic, index);

          return (
            <div key={index} className="relative">
              <div className={`w-full h-12 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} overflow-hidden relative`}>
                <div
                  className="h-full transition-all duration-500 ease-out flex items-center justify-between px-3"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: barColor,
                    minWidth: '100px'
                  }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-base font-bold text-white flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-sm font-bold text-white truncate">
                      {topic.name.replace(/"/g, '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {useCryptoColors && topic.crypto_data && (
                      <span className="text-xs font-bold text-white">
                        {getCryptoChange(topic) > 0 ? '+' : ''}{getCryptoChange(topic).toFixed(2)}%
                      </span>
                    )}
                    <span className="text-xs font-bold text-white">
                      {topic.searchVolumeRaw.replace(/"/g, '')}
                    </span>
                  </div>
                </div>
              </div>
              {topic.category && (
                <div className="mt-1 ml-1">
                  <span className={`inline-block text-xs px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                    {topic.category}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
