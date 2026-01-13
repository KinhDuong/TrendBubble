import { TrendingTopic, CryptoTimeframe } from '../types';
import { TrendingUp, Tag, Pin, X, DollarSign, Target, TrendingDown, BarChart3 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useState, useEffect, memo } from 'react';
import { formatCompactNumber } from '../utils/formatNumber';

interface KeywordPerformanceData {
  keyword: string;
  three_month_change?: number;
  yoy_change?: number;
  monthly_searches?: number[];
  bid_high?: number;
  competition?: string | number;
  competition_indexed?: number;
  searchVolume?: number;
  ai_insights?: string;
  sentiment?: number;
  search_variants?: string;
  demand_score?: number;
  interest_score?: number;
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

function BubbleTooltip({
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
  if (!topic) {
    console.error('BubbleTooltip: topic is null or undefined');
    return null;
  }

  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [windowDimensions, setWindowDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isExpanded, setIsExpanded] = useState(!isMobile && !!keywordData);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Desktop: small or expanded size
  // Increase height when AI insights are available
  const hasAIInsights = keywordData?.ai_insights ? true : false;
  const tooltipWidth = !isMobile && isExpanded ? 700 : 450;
  const tooltipHeight = !isMobile && isExpanded ? 800 : (hasAIInsights ? 480 : 320);
  const offset = 10;
  const padding = 20;

  let left = x + offset;
  let top = y;

  if (left + tooltipWidth > windowDimensions.width - padding) {
    left = x - tooltipWidth - offset;
  }
  if (left < padding) {
    left = padding;
  }

  if (top + tooltipHeight > windowDimensions.height - padding) {
    top = windowDimensions.height - tooltipHeight - padding;
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
      if (percentChange >= 0) return '#22C55E';
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
    try {
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
      const volumeStr = topic.searchVolumeRaw || topic.searchVolume?.toString() || '0';
      return volumeStr.replace(/"/g, '');
    } catch (error) {
      console.error('Error getting display volume:', error);
      return '0';
    }
  };

  const formatMonthYear = (monthStr: string) => {
    try {
      if (!monthStr) return 'N/A';
      const date = new Date(monthStr);
      if (isNaN(date.getTime())) return monthStr;
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch (error) {
      console.error('Error formatting month:', error);
      return monthStr || 'N/A';
    }
  };

  const getMonthlySearchColor = (volume: number, maxVolume: number) => {
    const ratio = volume / maxVolume;
    if (ratio >= 0.8) return theme === 'dark' ? '#3B82F6' : '#2563EB';
    if (ratio >= 0.6) return theme === 'dark' ? '#10B981' : '#059669';
    if (ratio >= 0.4) return theme === 'dark' ? '#F59E0B' : '#D97706';
    if (ratio >= 0.2) return theme === 'dark' ? '#F97316' : '#EA580C';
    return theme === 'dark' ? '#EF4444' : '#DC2626';
  };

  const formatChange = (value: number | string | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    const numValue = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(numValue)) return 'N/A';
    const percentage = numValue * 100;
    const formatted = percentage.toFixed(1);
    return percentage >= 0 ? `+${formatted}%` : `${formatted}%`;
  };

  const getChangeColor = (value: number | string | undefined) => {
    if (value === undefined || value === null) return theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    const numValue = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(numValue)) return theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    const percentage = numValue * 100;
    if (percentage >= 5) return 'text-green-500';
    if (percentage >= 0) return 'text-green-400';
    if (percentage >= -5) return 'text-red-400';
    return 'text-red-500';
  };

  const formatCompetition = (comp: string | number | undefined, indexedValue?: number) => {
    if (comp === undefined || comp === null) return 'N/A';

    let level: string;
    const numValue = typeof comp === 'number' ? comp : parseFloat(comp);

    if (isNaN(numValue)) {
      level = comp?.toString() || 'N/A';
    } else {
      if (numValue >= 0.7) level = 'High';
      else if (numValue >= 0.4) level = 'Medium';
      else level = 'Low';
    }

    if (indexedValue !== undefined && indexedValue !== null) {
      const indexed = Math.round(indexedValue);
      return `${level} ${indexed}/100`;
    }

    return level;
  };

  const getCompetitionColor = (comp: string | number | undefined) => {
    if (comp === undefined || comp === null) return theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    const value = typeof comp === 'number' ? comp : parseFloat(comp);
    if (isNaN(value)) return theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    if (value >= 0.7) return 'text-red-500';
    if (value >= 0.4) return 'text-yellow-500';
    return 'text-green-500';
  };

  const formatSentiment = (sentiment: number | undefined) => {
    if (sentiment === undefined || sentiment === null) return 'N/A';
    const percentage = Math.round(((sentiment + 1) / 2) * 100);
    return `${percentage}%`;
  };

  const getSentimentColor = (sentiment: number | undefined): string => {
    if (sentiment === undefined || sentiment === null) return 'bg-gray-400';
    const percentage = ((sentiment + 1) / 2) * 100;
    if (percentage >= 70) return 'bg-green-500';
    if (percentage >= 55) return 'bg-green-400';
    if (percentage >= 45) return 'bg-yellow-400';
    if (percentage >= 30) return 'bg-orange-400';
    return 'bg-red-500';
  };

  const getSentimentLabel = (sentiment: number | undefined): string => {
    if (sentiment === undefined || sentiment === null) return 'Unknown';
    const percentage = ((sentiment + 1) / 2) * 100;
    if (percentage >= 70) return 'Positive';
    if (percentage >= 55) return 'Somewhat Positive';
    if (percentage >= 45) return 'Neutral';
    if (percentage >= 30) return 'Somewhat Negative';
    return 'Negative';
  };

  const getSentimentEmoji = (sentiment: number | undefined): string => {
    if (sentiment === undefined || sentiment === null) return '😐';
    const percentage = ((sentiment + 1) / 2) * 100;
    if (percentage >= 70) return '🤩';
    if (percentage >= 55) return '😊';
    if (percentage >= 45) return '😐';
    if (percentage >= 30) return '😕';
    return '😢';
  };

  const formatDemandScore = (score: number | undefined) => {
    if (score === undefined || score === null) return 'N/A';
    if (score >= 40) return 'Very High';
    if (score >= 30) return 'Strong';
    if (score >= 20) return 'Moderate';
    return 'Low';
  };

  const getDemandScoreColor = (score: number | undefined) => {
    if (score === undefined || score === null) return theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    if (score >= 40) return 'text-green-500';
    if (score >= 30) return 'text-blue-500';
    if (score >= 20) return 'text-yellow-500';
    return theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  };

  const formatInterestScore = (score: number | undefined) => {
    if (score === undefined || score === null) return 'N/A';
    if (score >= 40) return 'Very High';
    if (score >= 30) return 'Strong';
    if (score >= 20) return 'Moderate';
    return 'Low';
  };

  const getInterestScoreColor = (score: number | undefined) => {
    if (score === undefined || score === null) return theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    if (score >= 40) return 'text-emerald-500';
    if (score >= 30) return 'text-blue-500';
    if (score >= 20) return 'text-amber-500';
    return theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  };

  const getTrendingStatus = () => {
    const threeMonth = keywordData?.three_month_change;
    const yoy = keywordData?.yoy_change;
    const monthlySearches = keywordData?.monthly_searches;

    if (threeMonth === undefined || threeMonth === null) return { label: 'N/A', icon: null, color: theme === 'dark' ? 'text-gray-400' : 'text-gray-600' };

    const threeMonthPercent = threeMonth * 100;
    const yoyPercent = yoy !== undefined && yoy !== null ? yoy * 100 : null;

    // Calculate historical slope from monthly_searches (last 48 months)
    let historicalSlope = 0;
    if (monthlySearches && monthlySearches.length >= 24) {
      const validData = monthlySearches
        .map((vol, index) => ({ x: index, y: vol }))
        .filter(d => d.y > 0);

      if (validData.length >= 24) {
        const n = validData.length;
        const sumX = validData.reduce((sum, d) => sum + d.x, 0);
        const sumY = validData.reduce((sum, d) => sum + d.y, 0);
        const sumXY = validData.reduce((sum, d) => sum + d.x * d.y, 0);
        const sumX2 = validData.reduce((sum, d) => sum + d.x * d.x, 0);

        const avgY = sumY / n;
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        historicalSlope = avgY > 0 ? (slope / avgY) * 100 : 0;
      }
    }

    // Calculate short-term score (70% weight)
    let shortTermMomentum = 0;
    if (yoyPercent !== null) {
      shortTermMomentum = (yoyPercent * 0.6) + (threeMonthPercent * 0.4);
    } else {
      shortTermMomentum = threeMonthPercent;
    }

    // Convert short-term momentum to 0-5 scale
    let shortTermLevel = 2; // Default: Stable
    if (shortTermMomentum >= 50) shortTermLevel = 5;
    else if (shortTermMomentum >= 25) shortTermLevel = 4;
    else if (shortTermMomentum >= 10) shortTermLevel = 3;
    else if (shortTermMomentum >= -10) shortTermLevel = 2;
    else if (shortTermMomentum >= -25) shortTermLevel = 1;
    else shortTermLevel = 0;

    // Calculate long-term score (30% weight)
    const annualizedSlope = historicalSlope * 12;
    let longTermLevel = 2; // Default: Stable
    if (annualizedSlope >= 50) longTermLevel = 5;
    else if (annualizedSlope >= 25) longTermLevel = 4;
    else if (annualizedSlope >= 10) longTermLevel = 3;
    else if (annualizedSlope >= -10) longTermLevel = 2;
    else if (annualizedSlope >= -25) longTermLevel = 1;
    else longTermLevel = 0;

    // Weighted average: 70% short-term, 30% long-term
    const weightedLevel = Math.round((shortTermLevel * 0.7) + (longTermLevel * 0.3));

    // Map to trend labels
    switch (weightedLevel) {
      case 5:
        return { label: 'Explosive Growth', icon: <TrendingUp size={14} />, color: 'text-emerald-600' };
      case 4:
        return { label: 'Strong Up', icon: <TrendingUp size={14} />, color: 'text-green-600' };
      case 3:
        return { label: 'Moderate Up', icon: <TrendingUp size={14} />, color: 'text-blue-500' };
      case 2:
        return { label: 'Stable', icon: <BarChart3 size={14} />, color: theme === 'dark' ? 'text-gray-400' : 'text-gray-600' };
      case 1:
        return { label: 'Moderate Down', icon: <TrendingDown size={14} />, color: 'text-orange-500' };
      case 0:
        return { label: 'Strong Down', icon: <TrendingDown size={14} />, color: 'text-red-600' };
      default:
        return { label: 'Stable', icon: <BarChart3 size={14} />, color: theme === 'dark' ? 'text-gray-400' : 'text-gray-600' };
    }
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
          } rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col`}
          style={{ zIndex: 9999, maxHeight: '85vh' }}
        >
          <div className="flex-shrink-0 pt-4 px-4">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <button
              onClick={onClose}
              className={`absolute top-4 right-4 p-2 rounded-full ${
                theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
              } transition-colors`}
            >
              <X size={18} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
            </button>
          </div>
          <div
            className="flex-1 overflow-y-auto px-4 pb-6 space-y-4"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
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
                <div className="flex items-center justify-between flex-1 gap-2">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <h3 className={`font-bold text-lg ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {topic.name.replace(/"/g, '')}
                    </h3>
                    {keywordData?.search_variants && (
                      <p className={`text-sm leading-relaxed ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <span className="font-semibold">Search Variants: </span>
                        {keywordData.search_variants}
                      </p>
                    )}
                    {topic.isDuplicate && topic.brand && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {topic.brand}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            {topic.note && (
              <div className={`border-t ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              } pt-4`}>
                <p className={`text-sm leading-relaxed ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <span className="font-bold">Note:</span> {topic.note}
                </p>
              </div>
            )}

            {keywordData?.ai_insights && (
              <div className={`border-t ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              } pt-4`}>
                <p className={`text-sm leading-relaxed ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                } whitespace-pre-wrap`}>
                  {keywordData.ai_insights}
                </p>
              </div>
            )}

            {keywordData && (
              <div className={`border-t ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              } pt-4`}>
                <h4 className={`text-sm font-semibold mb-3 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Performance Metrics
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {/* Row 1: Search, Demand, Interest, Trending */}
                  <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3`}>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp size={14} className="text-blue-500" />
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Search
                      </span>
                    </div>
                    <p className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {getDisplayVolume()}
                    </p>
                  </div>

                  <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Target size={14} className="text-blue-500" />
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Demand
                      </span>
                    </div>
                    <p className={`text-base font-bold ${getDemandScoreColor(keywordData.demand_score)}`}>
                      {formatDemandScore(keywordData.demand_score)}
                    </p>
                  </div>

                  <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3`}>
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 size={14} className="text-emerald-500" />
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Interest
                      </span>
                    </div>
                    <p className={`text-base font-bold ${getInterestScoreColor(keywordData.interest_score)}`}>
                      {formatInterestScore(keywordData.interest_score)}
                    </p>
                  </div>

                  <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3`}>
                    <div className="flex items-center gap-2 mb-1">
                      {getTrendingStatus().icon || <BarChart3 size={14} className="text-gray-500" />}
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Trending
                      </span>
                    </div>
                    <p className={`text-base font-bold ${getTrendingStatus().color}`}>
                      {getTrendingStatus().label}
                    </p>
                  </div>

                  {/* Row 2: 3-M Change, YoY Change, Top Bid, Keyword Comp. */}
                  <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3`}>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp size={14} className="text-blue-500" />
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        3-M Change
                      </span>
                    </div>
                    <p className={`text-base font-bold ${getChangeColor(keywordData.three_month_change)}`}>
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
                    <p className={`text-base font-bold ${getChangeColor(keywordData.yoy_change)}`}>
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
                    <p className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {keywordData.bid_high ? `$${keywordData.bid_high.toFixed(2)}` : 'N/A'}
                    </p>
                  </div>

                  <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Target size={14} className="text-orange-500" />
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Keyword Comp.
                      </span>
                    </div>
                    <p className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {formatCompetition(keywordData.competition, keywordData.competition_indexed)}
                    </p>
                  </div>

                  {keywordData.sentiment !== undefined && keywordData.sentiment !== null && (
                    <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3 col-span-2`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">{getSentimentEmoji(keywordData.sentiment)}</span>
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Sentiment
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getSentimentColor(keywordData.sentiment)} transition-all`}
                              style={{ width: `${Math.round(((keywordData.sentiment + 1) / 2) * 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {formatSentiment(keywordData.sentiment)}
                          </span>
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {getSentimentLabel(keywordData.sentiment)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                    if (!monthData || typeof monthData.volume !== 'number') {
                      return null;
                    }
                    const volumes = topic.monthlySearches!.map(m => m?.volume || 0).filter(v => v > 0);
                    const maxVolume = volumes.length > 0 ? Math.max(...volumes) : 1;
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
                          {formatCompactNumber(monthData.volume)}
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

  return createPortal(
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
            <div className="flex items-center justify-between flex-1 gap-2">
              <div className="flex-1">
                <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {topic.name.replace(/"/g, '')}
                </h3>
                {keywordData?.search_variants && (
                  <p className={`text-sm leading-relaxed mt-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <span className="font-semibold">Search Variants: </span>
                    {keywordData.search_variants}
                  </p>
                )}
              </div>
              {topic.isDuplicate && topic.brand && (
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {topic.brand}
                </span>
              )}
            </div>
          </div>
        </div>

        {topic.note && (
          <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pt-3`}>
            <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              <span className="font-bold">Note:</span> {topic.note}
            </p>
          </div>
        )}

        {keywordData?.ai_insights && (
          <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pt-3`}>
            <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-wrap`}>
              {keywordData.ai_insights}
            </p>
          </div>
        )}

        {isExpanded && keywordData && (
          <div
            className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pt-3`}
            style={{
              animation: 'slideDown 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <h4 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Performance Metrics
            </h4>
            <div className="grid grid-cols-4 gap-3">
              {/* Row 1: Search, Demand, Interest, Trending */}
              <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={14} className="text-blue-500" />
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Search
                  </span>
                </div>
                <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {getDisplayVolume()}
                </p>
              </div>

              <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <Target size={14} className="text-blue-500" />
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Demand
                  </span>
                </div>
                <p className={`text-lg font-bold ${getDemandScoreColor(keywordData.demand_score)}`}>
                  {formatDemandScore(keywordData.demand_score)}
                </p>
              </div>

              <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 size={14} className="text-emerald-500" />
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Interest
                  </span>
                </div>
                <p className={`text-lg font-bold ${getInterestScoreColor(keywordData.interest_score)}`}>
                  {formatInterestScore(keywordData.interest_score)}
                </p>
              </div>

              <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  {getTrendingStatus().icon || <BarChart3 size={14} className="text-gray-500" />}
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Trending
                  </span>
                </div>
                <p className={`text-lg font-bold ${getTrendingStatus().color}`}>
                  {getTrendingStatus().label}
                </p>
              </div>

              {/* Row 2: 3-M Change, YoY Change, Top Bid, Keyword Comp. */}
              <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={14} className="text-blue-500" />
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    3-M Change
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
                    Keyword Comp.
                  </span>
                </div>
                <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {formatCompetition(keywordData.competition, keywordData.competition_indexed)}
                </p>
              </div>

              {keywordData.sentiment !== undefined && keywordData.sentiment !== null && (
                <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3 col-span-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{getSentimentEmoji(keywordData.sentiment)}</span>
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Sentiment
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getSentimentColor(keywordData.sentiment)} transition-all`}
                          style={{ width: `${Math.round(((keywordData.sentiment + 1) / 2) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {formatSentiment(keywordData.sentiment)}
                      </span>
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {getSentimentLabel(keywordData.sentiment)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {topic.monthlySearches && topic.monthlySearches.length > 0 && (
          <div>
            <h4 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Monthly Search Volumes
            </h4>
            <div className={`flex flex-wrap gap-2 overflow-y-auto ${isExpanded ? 'max-h-60' : 'max-h-44'}`}>
              {topic.monthlySearches.map((monthData, index) => {
                if (!monthData || typeof monthData.volume !== 'number') {
                  return null;
                }
                const volumes = topic.monthlySearches!.map(m => m?.volume || 0).filter(v => v > 0);
                const maxVolume = volumes.length > 0 ? Math.max(...volumes) : 1;
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
                      {formatCompactNumber(monthData.volume)}
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
    </>,
    document.body
  );
}

export default memo(BubbleTooltip);
