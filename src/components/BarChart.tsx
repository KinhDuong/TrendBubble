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
  const [animate, setAnimate] = useState(false);

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
            <div key={index}>
              {/* Mobile: Compact layout */}
              <div className="md:hidden">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold flex-shrink-0 w-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {index + 1}
                  </span>
                  <span className={`text-xs font-medium truncate overflow-hidden flex-shrink-0 w-20 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                    {topic.name.replace(/"/g, '')}
                  </span>
                  <div className={`flex-1 h-8 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} overflow-hidden relative`}>
                    <div
                      className="h-full transition-all duration-1000 ease-out"
                      style={{
                        width: animate ? `${barWidth}%` : '0%',
                        backgroundColor: barColor
                      }}
                    />
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 w-16 text-right ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {topic.searchVolumeRaw.replace(/"/g, '')}
                  </span>
                </div>
                {(topic.category || (useCryptoColors && topic.crypto_data)) && (
                  <div className="flex items-center gap-2 mt-1 ml-6">
                    {topic.category && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                        {topic.category}
                      </span>
                    )}
                    {useCryptoColors && topic.crypto_data && (
                      <span className={`text-xs font-bold ${getCryptoChange(topic) > 0 ? 'text-green-500' : getCryptoChange(topic) < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {getCryptoChange(topic) > 0 ? '+' : ''}{getCryptoChange(topic).toFixed(2)}%
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Desktop: Clean horizontal layout with fixed columns */}
              <div className="hidden md:block">
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-bold flex-shrink-0 w-8 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {index + 1}
                  </span>
                  <span className={`text-sm font-medium truncate overflow-hidden flex-shrink-0 w-48 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                    {topic.name.replace(/"/g, '')}
                  </span>
                  <div className={`flex-1 h-10 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} overflow-hidden relative`}>
                    <div
                      className="h-full transition-all duration-1000 ease-out"
                      style={{
                        width: animate ? `${barWidth}%` : '0%',
                        backgroundColor: barColor
                      }}
                    />
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 w-24 text-right ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {topic.searchVolumeRaw.replace(/"/g, '')}
                  </span>
                </div>
                {(topic.category || (useCryptoColors && topic.crypto_data)) && (
                  <div className="flex items-center gap-2 mt-1 ml-[14rem]">
                    {topic.category && (
                      <span className={`text-xs px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                        {topic.category}
                      </span>
                    )}
                    {useCryptoColors && topic.crypto_data && (
                      <span className={`text-xs font-bold ${getCryptoChange(topic) > 0 ? 'text-green-500' : getCryptoChange(topic) < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {getCryptoChange(topic) > 0 ? '+' : ''}{getCryptoChange(topic).toFixed(2)}%
                      </span>
                    )}
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
