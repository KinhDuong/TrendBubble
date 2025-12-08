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
      className={`w-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-2 md:p-6`}
      style={{ minHeight: '600px' }}
    >
      <div className="space-y-2 md:space-y-3">
        {displayTopics.map((topic, index) => {
          const barWidth = (topic.searchVolume / maxValue) * 100;
          const barColor = getBarColor(topic, index);

          return (
            <div key={index} className="relative">
              {/* Mobile: Stack layout */}
              <div className="md:hidden">
                <div className={`h-10 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} overflow-hidden relative`}>
                  <div
                    className="h-full transition-all duration-500 ease-out flex items-center px-2"
                    style={{
                      width: `${Math.max(barWidth, 30)}%`,
                      backgroundColor: barColor
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs font-bold text-white flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-xs font-semibold text-white truncate">
                        {topic.name.replace(/"/g, '')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1 px-1">
                  <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {topic.searchVolumeRaw.replace(/"/g, '')}
                  </span>
                  {useCryptoColors && topic.crypto_data && (
                    <span className={`text-xs font-bold ${getCryptoChange(topic) > 0 ? 'text-green-500' : getCryptoChange(topic) < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                      {getCryptoChange(topic) > 0 ? '+' : ''}{getCryptoChange(topic).toFixed(2)}%
                    </span>
                  )}
                  {topic.category && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                      {topic.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Desktop: Original horizontal layout */}
              <div className="hidden md:block">
                <div className="flex items-center gap-3">
                  <div className={`flex-1 h-12 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} overflow-hidden relative`}>
                    <div
                      className="h-full transition-all duration-500 ease-out flex items-center px-3"
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
                        {useCryptoColors && topic.crypto_data && (
                          <span className="text-xs font-bold text-white flex-shrink-0 ml-2">
                            {getCryptoChange(topic) > 0 ? '+' : ''}{getCryptoChange(topic).toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {topic.searchVolumeRaw.replace(/"/g, '')}
                  </span>
                </div>
                {topic.category && (
                  <div className="mt-1 ml-1">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                      {topic.category}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
