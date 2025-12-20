import { TrendingTopic, CryptoTimeframe } from '../types';
import { TrendingUp, Tag, Pin, X, DollarSign, Target, TrendingDown, BarChart3, Maximize2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';

interface KeywordPerformanceData {
  keyword: string;
  three_month_change?: number;
  yoy_change?: number;
  monthly_searches?: number[];
  bid_high?: number;
  competition?: string | number;
  searchVolume?: number;
}

interface BubbleTooltipProps {
  topic: TrendingTopic;
  x: number;
  y: number;
  rank: number;
  theme: 'dark' | 'light';
  isPinned: boolean;
  onTogglePin: () => void;
  onCompare: () => void;
  isComparing: boolean;
  onClose: () => void;
  cryptoTimeframe?: CryptoTimeframe;
  keywordData?: KeywordPerformanceData;
}

export default function BubbleTooltip({
  topic,
  x,
  y,
  rank,
  theme,
  isPinned,
  onTogglePin,
  onCompare,
  isComparing,
  onClose,
  cryptoTimeframe = '1h',
  keywordData
}: BubbleTooltipProps) {
  const isMobile = window.innerWidth < 768;
  const [isExpanded, setIsExpanded] = useState(!isMobile && !!keywordData);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 400);
    return () => clearTimeout(timer);
  }, []);

  // Desktop: small or expanded size
  const tooltipWidth = !isMobile && isExpanded ? 480 : 280;
  const tooltipHeight = !isMobile && isExpanded ? 600 : 200;
  const offset = 10;
  const padding = 20;

  let left = x + offset;
  let top = y;

  if (left + tooltipWidth > window.innerWidth - padding) {
    left = x - tooltipWidth - offset;
  }
  if (left < padding) {
    left = padding;
  }

  if (top + tooltipHeight > window.innerHeight - padding) {
    top = window.innerHeight - tooltipHeight - padding;
  }
  if (top < padding) {
    top = padding;
  }

  const getSourceLabel = (source: string | null) => {
    if (!source) return 'Unknown';
    const sourceMap: { [key: string]: string } = {
      'google_trends': 'Google Trends',
      'user_upload': 'User Upload',
      'custom': 'Custom'
    };
    return sourceMap[source] || source.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getRankColor = (rankIndex: number) => {
    if (topic.source === 'coingecko_crypto') {
      const timeframeMap = {
        '1h': 'change_1h',
        '24h': 'change_24h',
        '7d': 'change_7d',
        '30d': 'change_30d',
        '1y': 'change_1y',
      };
      const field = timeframeMap[cryptoTimeframe] as keyof typeof topic.crypto_data;
      const percentChange = topic.crypto_data?.[field] as number || 0;

      if (percentChange >= 5) return '#0D7C4E';
      if (percentChange >= 2) return '#16A34A';
      if (percentChange >= 0) return '#10B981';
      if (percentChange >= -2) return '#DC2626';
      if (percentChange >= -5) return '#B91C1C';
      return '#991B1B';
    }

    const colors = [
      '#3B82F6', '#10B981', '#EAB308', '#EF4444',
      '#EC4899', '#14B8A6', '#F97316', '#06B6D4',
      '#8B5CF6', '#84CC16', '#F59E0B', '#6366F1'
    ];
    return colors[(rankIndex - 1) % colors.length];
  };

  const getDisplayVolume = () => {
    if (topic.crypto_data && topic.source === 'coingecko_crypto') {
      const timeframeMap = {
        '1h': topic.crypto_data.formatted.change_1h,
        '24h': topic.crypto_data.formatted.change_24h,
        '7d': topic.crypto_data.formatted.change_7d,
        '30d': topic.crypto_data.formatted.change_30d,
        '1y': topic.crypto_data.formatted.change_1y,
      };
      const timeframeLabel = {
        '1h': '1h',
        '24h': '24h',
        '7d': '7d',
        '30d': '30d',
        '1y': '1y',
      };
      return `${timeframeMap[cryptoTimeframe]}% (${timeframeLabel[cryptoTimeframe]}) • ${topic.crypto_data.formatted.price} • ${topic.crypto_data.formatted.volume}`;
    }
    return topic.searchVolumeRaw.replace(/"/g, '');
  };

  const formatMonthYear = (monthStr: string) => {
    const date = new Date(monthStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getMonthlySearchColor = (volume: number, maxVolume: number) => {
    const ratio = volume / maxVolume;
    if (ratio >= 0.8) return theme === 'dark' ? '#3B82F6' : '#2563EB';
    if (ratio >= 0.6) return theme === 'dark' ? '#10B981' : '#059669';
    if (ratio >= 0.4) return theme === 'dark' ? '#F59E0B' : '#D97706';
    if (ratio >= 0.2) return theme === 'dark' ? '#F97316' : '#EA580C';
    return theme === 'dark' ? '#EF4444' : '#DC2626';
  };

  const formatChange = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    const formatted = (value * 100).toFixed(1);
    return value >= 0 ? `+${formatted}%` : `${formatted}%`;
  };

  const getChangeColor = (value: number | undefined) => {
    if (value === undefined || value === null) return theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    if (value >= 0.05) return 'text-green-500';
    if (value >= 0) return 'text-emerald-500';
    if (value >= -0.05) return 'text-red-400';
    return 'text-red-500';
  };

  const formatCompetition = (comp: string | number | undefined) => {
    if (comp === undefined || comp === null) return 'N/A';
    if (typeof comp === 'number') return comp.toFixed(2);
    return comp;
  };

  const getCompetitionColor = (comp: string | number | undefined) => {
    if (comp === undefined || comp === null) return theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    const value = typeof comp === 'number' ? comp : parseFloat(comp);
    if (isNaN(value)) return theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    if (value >= 0.7) return 'text-red-500';
    if (value >= 0.4) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (isMobile) {
    return createPortal(
      <>
        <div
          className="fixed inset-0 bg-black/50 animate-in fade-in duration-200"
          style={{ zIndex: 9998 }}
          onClick={onClose}
        />
        <div
          className={`fixed bottom-0 left-0 right-0 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          } rounded-t-2xl shadow-2xl p-4 pb-6 animate-in slide-in-from-bottom duration-300`}
          style={{ zIndex: 9999 }}
        >
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-full ${
              theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
            } transition-colors`}
          >
            <X size={18} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
          </button>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="flex items-center justify-center rounded-full font-bold text-white shadow-lg"
                  style={{
                    backgroundColor: getRankColor(rank),
                    width: '48px',
                    height: '48px',
                    fontSize: '18px'
                  }}
                >
                  {rank}
                </div>
                <h3 className={`font-bold text-xl flex-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {topic.name.replace(/"/g, '')}
                </h3>
              </div>
              {topic.category && (
                <div className="flex items-center gap-1">
                  <Tag size={14} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {topic.category}
                  </span>
                </div>
              )}
            </div>

            <div className={`border-t ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            } pt-4 space-y-3`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Search Volume
                </span>
                <div className="flex items-center gap-1">
                  <TrendingUp size={16} className="text-blue-500" />
                  <span className={`font-semibold text-base ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {getDisplayVolume()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Source
                </span>
                <span className={`text-sm font-medium px-2 py-1 rounded ${
                  topic.source === 'user_upload'
                    ? theme === 'dark' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-green-100 text-green-700'
                    : theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                }`}>
                  {getSourceLabel(topic.source)}
                </span>
              </div>

              {topic.note && (
                <p className={`text-sm leading-relaxed ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <span className="font-bold">Note:</span> {topic.note}
                </p>
              )}
            </div>

            {topic.monthlySearches && topic.monthlySearches.length > 0 && (
              <div className={`border-t ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              } pt-4`}>
                <h4 className={`text-sm font-semibold mb-3 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Monthly Search Volumes
                </h4>
                <div className="flex flex-wrap gap-2">
                  {topic.monthlySearches.map((monthData, index) => {
                    const maxVolume = Math.max(...topic.monthlySearches!.map(m => m.volume));
                    const color = getMonthlySearchColor(monthData.volume, maxVolume);
                    const size = 32 + (monthData.volume / maxVolume) * 24;

                    return (
                      <div
                        key={index}
                        className="flex flex-col items-center group relative"
                        style={{ minWidth: '64px' }}
                      >
                        <div
                          className="flex items-center justify-center rounded-full text-white text-xs font-bold shadow-md transition-transform hover:scale-110"
                          style={{
                            width: `${size}px`,
                            height: `${size}px`,
                            backgroundColor: color,
                            fontSize: `${Math.max(8, size / 4)}px`
                          }}
                          title={`${formatMonthYear(monthData.month)}: ${monthData.volume.toLocaleString()}`}
                        >
                          {monthData.volume >= 1000
                            ? `${(monthData.volume / 1000).toFixed(1)}K`
                            : monthData.volume}
                        </div>
                        <span className={`text-xs mt-1 text-center ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {formatMonthYear(monthData.month)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={`border-t ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            } pt-4 flex gap-3`}>
              <button
                onClick={onTogglePin}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  isPinned
                    ? 'bg-purple-500 text-white hover:bg-purple-600 active:bg-purple-700'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 active:bg-gray-500'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                <Pin size={16} className={isPinned ? 'rotate-45' : ''} />
                {isPinned ? 'Pinned' : 'Pin'}
              </button>
              <button
                onClick={onCompare}
                className={`flex-1 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  isComparing
                    ? 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 active:bg-gray-500'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                {isComparing ? 'Selected' : 'Compare'}
              </button>
            </div>

            {topic.url && (
              <a
                href={topic.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block text-center text-base font-medium py-2 ${
                  theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                } transition-colors`}
              >
                Learn more →
              </a>
            )}
          </div>
        </div>
      </>,
      document.body
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{ background: 'transparent' }}
      />
      <div
        className={`fixed z-50 ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border rounded-lg shadow-2xl p-4 overflow-y-auto`}
        style={{
          left: `${left}px`,
          top: `${top}px`,
          width: `${tooltipWidth}px`,
          maxHeight: `${tooltipHeight}px`,
          transition: isAnimating
            ? 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out'
            : 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isAnimating ? 'scale(0.85)' : 'scale(1)',
          opacity: isAnimating ? 0 : 1,
          transformOrigin: 'top left'
        }}
      >
        <div className="absolute top-2 right-2 flex gap-1">
          {keywordData && !isMobile && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`p-1 rounded-full ${
                theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              } transition-colors`}
              title={isExpanded ? 'Collapse' : 'Expand details'}
            >
              <Maximize2
                size={16}
                className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}
          <button
            onClick={onClose}
            className={`p-1 rounded-full ${
              theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            } transition-colors`}
          >
            <X size={16} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
          </button>
        </div>
      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="flex items-center justify-center rounded-full font-bold text-white shadow-lg flex-shrink-0"
              style={{
                backgroundColor: getRankColor(rank),
                width: '36px',
                height: '36px',
                fontSize: '14px'
              }}
            >
              {rank}
            </div>
            <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {topic.name.replace(/"/g, '')}
            </h3>
          </div>
          {topic.category && (
            <div className="flex items-center gap-1 mb-2">
              <Tag size={14} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {topic.category}
              </span>
            </div>
          )}
        </div>

        <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pt-3 space-y-2`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Search Volume
            </span>
            <div className="flex items-center gap-1">
              <TrendingUp size={14} className="text-blue-500" />
              <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {getDisplayVolume()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Source
            </span>
            <span className={`text-sm font-medium px-2 py-0.5 rounded ${
              topic.source === 'user_upload'
                ? theme === 'dark' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-green-100 text-green-700'
                : theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
            }`}>
              {getSourceLabel(topic.source)}
            </span>
          </div>

          {topic.note && (
            <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              <span className="font-bold">Note:</span> {topic.note}
            </p>
          )}
        </div>

        {isExpanded && keywordData && (
          <div
            className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pt-3`}
            style={{
              animation: 'slideDown 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <h4 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Keyword Performance Metrics
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={14} className="text-blue-500" />
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    3-Month Change
                  </span>
                </div>
                <p className={`text-lg font-bold ${getChangeColor(keywordData.three_month_change)}`}>
                  {formatChange(keywordData.three_month_change)}
                </p>
              </div>

              <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 size={14} className="text-purple-500" />
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    YoY Change
                  </span>
                </div>
                <p className={`text-lg font-bold ${getChangeColor(keywordData.yoy_change)}`}>
                  {formatChange(keywordData.yoy_change)}
                </p>
              </div>

              <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign size={14} className="text-green-500" />
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Top Bid (High)
                  </span>
                </div>
                <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {keywordData.bid_high ? `$${keywordData.bid_high.toFixed(2)}` : 'N/A'}
                </p>
              </div>

              <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <Target size={14} className="text-orange-500" />
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Competition
                  </span>
                </div>
                <p className={`text-lg font-bold ${getCompetitionColor(keywordData.competition)}`}>
                  {formatCompetition(keywordData.competition)}
                </p>
              </div>
            </div>
          </div>
        )}

        {topic.monthlySearches && topic.monthlySearches.length > 0 && (
          <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pt-3`}>
            <h4 className={`text-xs font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Monthly Search Volumes
            </h4>
            <div className={`flex flex-wrap gap-2 overflow-y-auto ${isExpanded ? 'max-h-48' : 'max-h-32'}`}>
              {topic.monthlySearches.map((monthData, index) => {
                const maxVolume = Math.max(...topic.monthlySearches!.map(m => m.volume));
                const color = getMonthlySearchColor(monthData.volume, maxVolume);
                const size = 28 + (monthData.volume / maxVolume) * 20;

                return (
                  <div
                    key={index}
                    className="flex flex-col items-center group relative"
                    style={{ minWidth: '56px' }}
                  >
                    <div
                      className="flex items-center justify-center rounded-full text-white text-xs font-bold shadow-md transition-transform hover:scale-110"
                      style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        backgroundColor: color,
                        fontSize: `${Math.max(7, size / 4)}px`
                      }}
                      title={`${formatMonthYear(monthData.month)}: ${monthData.volume.toLocaleString()}`}
                    >
                      {monthData.volume >= 1000
                        ? `${(monthData.volume / 1000).toFixed(1)}K`
                        : monthData.volume}
                    </div>
                    <span className={`text-xs mt-1 text-center ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`} style={{ fontSize: '10px' }}>
                      {formatMonthYear(monthData.month)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pt-3 flex gap-2`}>
          <button
            onClick={onTogglePin}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
              isPinned
                ? 'bg-purple-500 text-white hover:bg-purple-600'
                : theme === 'dark'
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Pin size={14} className={isPinned ? 'rotate-45' : ''} />
            {isPinned ? 'Pinned' : 'Pin'}
          </button>
          <button
            onClick={onCompare}
            className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
              isComparing
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : theme === 'dark'
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isComparing ? 'Selected' : 'Compare'}
          </button>
        </div>

        {topic.url && (
          <a
            href={topic.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`block text-center text-sm font-medium ${
              theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            } transition-colors`}
          >
            Learn more →
          </a>
        )}
      </div>
    </div>
    </>
  );
}
