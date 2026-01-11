import { useState, useEffect, useRef } from 'react';
import { TrendingUp, Zap, ThumbsUp, Sparkles, ArrowUp, ArrowUpRight, ArrowRight, ArrowDownRight, ArrowDown, Rocket } from 'lucide-react';
import { formatCompactNumber } from '../utils/formatNumber';

interface BrandStats {
  brand: string;
  brandSearchVolume?: number;
  brand_search_volume?: number;
  totalKeywords?: number;
  total_keywords?: number;
  totalVolume?: number;
  total_volume?: number;
  threeMonthChange?: number;
  three_month_change?: number;
  yoyChange?: number;
  yoy_change?: number;
  avgSentiment?: number;
  avg_sentiment?: number;
  avgDemandScore?: number;
  avg_demand_score?: number;
  avgInterestScore?: number;
  avg_interest_score?: number;
  avgSlope?: number;
  avg_slope?: number;
  avgRSquared?: number;
  avg_r_squared?: number;
  risingStarsHistorical?: number;
  rising_stars_historical?: number;
  topPerformers?: number;
  top_performers?: number;
  risingStars?: number;
  rising_stars?: number;
  declining?: number;
  stable?: number;
  highIntent?: number;
  high_intent?: number;
}

interface BrandKeywordPerformanceSummaryProps {
  brandStats: BrandStats;
  brandColor: string;
  theme: 'light' | 'dark';
}

export default function BrandKeywordPerformanceSummary({ brandStats, brandColor, theme }: BrandKeywordPerformanceSummaryProps) {
  const [tooltipMetric, setTooltipMetric] = useState<string | null>(null);
  const tooltipRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipMetric) {
        const tooltipElement = tooltipRefs.current[tooltipMetric];
        if (tooltipElement && !tooltipElement.contains(event.target as Node)) {
          setTooltipMetric(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tooltipMetric]);

  const normalizedStats = {
    brand: brandStats.brand,
    brandSearchVolume: brandStats.brandSearchVolume ?? brandStats.brand_search_volume ?? 0,
    totalVolume: brandStats.totalVolume ?? brandStats.total_volume ?? 0,
    threeMonthChange: brandStats.threeMonthChange ?? brandStats.three_month_change ?? 0,
    yoyChange: brandStats.yoyChange ?? brandStats.yoy_change ?? 0,
    avgSentiment: brandStats.avgSentiment ?? brandStats.avg_sentiment ?? 0,
    avgDemandScore: brandStats.avgDemandScore ?? brandStats.avg_demand_score ?? 0,
    avgInterestScore: brandStats.avgInterestScore ?? brandStats.avg_interest_score ?? 0,
    avgSlope: brandStats.avgSlope ?? brandStats.avg_slope ?? 0,
    avgRSquared: brandStats.avgRSquared ?? brandStats.avg_r_squared ?? 0,
    risingStarsHistorical: brandStats.risingStarsHistorical ?? brandStats.rising_stars_historical ?? 0,
  };

  const toggleTooltip = (metric: string) => {
    if (tooltipMetric === metric) {
      setTooltipMetric(null);
    } else {
      setTooltipMetric(metric);
    }
  };

  const calculateTrending = (): { ArrowIcon: any; label: string; color: string; explanation: string } => {
    const yoyChange = normalizedStats.yoyChange || 0;
    const threeMonthChange = normalizedStats.threeMonthChange || 0;
    const risingStarsHist = normalizedStats.risingStarsHistorical || 0;
    const avgSlope = normalizedStats.avgSlope || 0;
    const rSquared = normalizedStats.avgRSquared || 0;

    let level = 0;
    let ArrowIcon = ArrowRight;
    let label = 'Stable';
    let color = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

    if (yoyChange > 0.30) {
      level = 5;
      ArrowIcon = Rocket;
      label = 'Explosive Up';
      color = 'text-emerald-500';
    } else if (yoyChange >= 0.15) {
      level = 4;
      ArrowIcon = ArrowUp;
      label = 'Strong Up';
      color = 'text-green-500';
    } else if (yoyChange >= 0.05) {
      level = 3;
      ArrowIcon = ArrowUpRight;
      label = 'Moderate Up';
      color = 'text-blue-500';
    } else if (yoyChange >= -0.05) {
      level = 2;
      ArrowIcon = ArrowRight;
      label = 'Stable';
      color = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    } else if (yoyChange >= -0.15) {
      level = 1;
      ArrowIcon = ArrowDownRight;
      label = 'Slight Down';
      color = 'text-orange-500';
    } else {
      level = 0;
      ArrowIcon = ArrowDown;
      label = 'Sharp Down';
      color = 'text-red-500';
    }

    const momentumDiff = threeMonthChange - yoyChange;
    if (momentumDiff > 0.15 && level < 5) {
      level += 1;
    } else if (momentumDiff < -0.15 && level > 0) {
      level -= 1;
    }

    if (risingStarsHist > 400 && threeMonthChange > 0.30) {
      level = 5;
    }

    if (avgSlope > 0.07 && level === 5) {
      label = 'Explosive Up';
    }

    if (level === 5) {
      ArrowIcon = Rocket;
      label = 'Explosive Up';
      color = 'text-emerald-500';
    } else if (level === 4) {
      ArrowIcon = ArrowUp;
      label = 'Strong Up';
      color = 'text-green-500';
    } else if (level === 3) {
      ArrowIcon = ArrowUpRight;
      label = 'Moderate Up';
      color = 'text-blue-500';
    } else if (level === 2) {
      ArrowIcon = ArrowRight;
      label = 'Stable';
      color = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    } else if (level === 1) {
      ArrowIcon = ArrowDownRight;
      label = 'Slight Down';
      color = 'text-orange-500';
    } else {
      ArrowIcon = ArrowDown;
      label = 'Sharp Down';
      color = 'text-red-500';
    }

    const reliabilityPercent = (rSquared * 100).toFixed(0);
    const explanation = `YoY: ${formatPercentage(yoyChange)} | 3M: ${formatPercentage(threeMonthChange)} | Historical Growth: ${formatMonthlyGrowth(avgSlope)} | Rising Stars: ${risingStarsHist} | Trend Reliability: ${reliabilityPercent}% confidence`;

    return { ArrowIcon, label, color, explanation };
  };

  const getIntensityBoost = (): { hasBoost: boolean; level: 'high' | 'extreme' | null; reason: string } => {
    const slope = normalizedStats.avgSlope || 0;
    const rSquared = normalizedStats.avgRSquared || 0;
    const risingStarsHist = normalizedStats.risingStarsHistorical || 0;
    const threeMonthChange = normalizedStats.threeMonthChange || 0;

    if (risingStarsHist > 400 && threeMonthChange > 0.30) {
      return {
        hasBoost: true,
        level: 'extreme',
        reason: `${risingStarsHist} keywords with strong historical growth + ${(threeMonthChange * 100).toFixed(1)}% recent surge`
      };
    }

    if (slope > 0.07 && rSquared > 0.7) {
      return {
        hasBoost: true,
        level: 'high',
        reason: `${(slope * 100).toFixed(1)}% monthly growth with ${(rSquared * 100).toFixed(0)}% trend reliability`
      };
    }

    return { hasBoost: false, level: null, reason: '' };
  };

  const getInterestLevel = (score: number) => {
    if (score >= 40) return 'Very High';
    if (score >= 30) return 'Strong';
    if (score >= 20) return 'Moderate';
    return 'Low';
  };

  const getInterestLevelColor = (score: number) => {
    if (score >= 40) return 'text-emerald-500';
    if (score >= 30) return 'text-blue-500';
    if (score >= 20) return 'text-amber-500';
    return theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  };

  const getInterestExplanation = (score: number) => {
    if (score >= 40) return 'Cultural buzz, trending topic — perfect for content marketing.';
    if (score >= 30) return 'Build authority here.';
    if (score >= 20) return 'Emerging curiosity.';
    return 'Limited awareness.';
  };

  const getDemandLevel = (score: number) => {
    if (score >= 40) return 'Very High';
    if (score >= 30) return 'Strong';
    if (score >= 20) return 'Moderate';
    return 'Low';
  };

  const getDemandLevelColor = (score: number) => {
    if (score >= 40) return 'text-green-500';
    if (score >= 30) return 'text-blue-500';
    if (score >= 20) return 'text-yellow-500';
    return theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  };

  const getDemandExplanation = (score: number) => {
    if (score >= 40) return 'Prioritize for ads/content.';
    if (score >= 30) return 'Good targeting opportunity.';
    if (score >= 20) return 'Nurture with content.';
    return 'Monitor or deprioritize.';
  };

  const formatPercentage = (value: number) => {
    if (value === 0) return '0%';
    const formatted = (value * 100).toFixed(0);
    return value > 0 ? `+${formatted}%` : `${formatted}%`;
  };

  const formatSentiment = (value: number) => {
    if (value === 0) return 'Neutral';
    if (value > 0.3) return 'Positive';
    if (value > 0) return 'Slightly Positive';
    if (value > -0.3) return 'Slightly Negative';
    return 'Negative';
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  };

  const getSentimentColor = (value: number) => {
    if (value > 0.3) return 'text-green-500';
    if (value > 0) return 'text-green-400';
    if (value > -0.3) return theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    if (value > -0.5) return 'text-orange-400';
    return 'text-red-500';
  };

  const formatMonthlyGrowth = (slope: number): string => {
    if (slope === 0) return 'Flat';
    const pct = (slope * 100).toFixed(2);
    return slope > 0 ? `+${pct}%` : `${pct}%`;
  };

  const trending = calculateTrending();
  const intensityBoost = getIntensityBoost();

  const metrics = [
    { label: 'Trending', icon: TrendingUp, key: 'trending', format: () => '', colorize: 'trending' },
    { label: 'Monthly Search', icon: TrendingUp, key: 'brandSearchVolume', format: (v: number) => formatCompactNumber(v) },
    { label: 'Targeted Reach', icon: TrendingUp, key: 'totalVolume', format: (v: number) => formatCompactNumber(v) },
    { label: 'Customer Demand', icon: Zap, key: 'avgDemandScore', format: (v: number) => v > 0 ? `${v.toFixed(1)}/50` : 'N/A', colorize: 'demand' },
    { label: 'Customer Interest', icon: Sparkles, key: 'avgInterestScore', format: (v: number) => v > 0 ? `${v.toFixed(1)}/50` : 'N/A', colorize: 'interest' },
    { label: '3-Month Change', icon: TrendingUp, key: 'threeMonthChange', format: (v: number) => formatPercentage(v), colorize: true },
    { label: 'YoY Change', icon: TrendingUp, key: 'yoyChange', format: (v: number) => formatPercentage(v), colorize: true },
    { label: 'Sentiment', icon: ThumbsUp, key: 'avgSentiment', format: (v: number) => formatSentiment(v), colorize: 'sentiment' },
  ];

  return (
    <div className={`mb-6 rounded-xl border overflow-visible ${theme === 'dark' ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700' : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'}`}>
      <div
        className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} overflow-visible relative`}
        style={{
          background: theme === 'dark'
            ? `linear-gradient(135deg, ${brandColor}20, ${brandColor}10)`
            : `linear-gradient(135deg, ${brandColor}15, ${brandColor}05)`
        }}
      >
        <div className="flex items-center justify-center">
          <div className="relative inline-block">
            <div
              className="text-lg md:text-xl font-black uppercase tracking-wide px-4 py-2 rounded-full inline-block"
              style={{
                background: brandColor,
                color: 'white'
              }}
            >
              {normalizedStats.brand}
            </div>

            {intensityBoost.hasBoost && (
              <div className="absolute -top-2 -right-2 animate-pulse">
                <div
                  className={`text-2xl ${intensityBoost.level === 'extreme' ? 'animate-bounce' : ''}`}
                  title={intensityBoost.reason}
                >
                  {intensityBoost.level === 'extreme' ? '🚀' : '🔥'}
                </div>
              </div>
            )}
          </div>
        </div>

        {intensityBoost.hasBoost && (
          <div className="flex justify-center mt-2">
            <div className={`text-xs px-2 py-1 rounded ${
              intensityBoost.level === 'extreme'
                ? theme === 'dark' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                : theme === 'dark' ? 'bg-orange-900/40 text-orange-300' : 'bg-orange-100 text-orange-700'
            }`}>
              {intensityBoost.level === 'extreme' ? 'Explosive Growth' : 'Strong Momentum'}
            </div>
          </div>
        )}
      </div>

      <div className="overflow-visible">
        {metrics.map((metric, metricIndex) => {
          const Icon = metric.icon;
          const value = (normalizedStats as any)[metric.key];
          const formattedValue = metric.format(value);

          let textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';
          if (metric.colorize === true) {
            textColor = getTrendColor(value);
          } else if (metric.colorize === 'sentiment') {
            textColor = getSentimentColor(value);
          } else if (metric.colorize === 'demand') {
            textColor = getDemandLevelColor(value);
          } else if (metric.colorize === 'interest') {
            textColor = getInterestLevelColor(value);
          }

          const isTrending = metric.key === 'trending';
          const isInterestScore = metric.key === 'avgInterestScore';
          const isDemandScore = metric.key === 'avgDemandScore';
          const showTooltip = tooltipMetric === metric.key;

          return (
            <div
              key={metric.key}
              className={`grid grid-cols-2 gap-4 border-b ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'} hover:${theme === 'dark' ? 'bg-gray-700/20' : 'bg-gray-50'} transition-colors overflow-visible`}
            >
              <div className={`p-4 flex items-center gap-3 ${theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50/50'}`}>
                <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>
                  <Icon className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`} />
                </div>
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {metric.label}
                </span>
              </div>

              <div className={`p-4 flex items-center justify-center relative`}>
                {isTrending ? (
                  <div
                    className="relative"
                    ref={(el) => { tooltipRefs.current[metric.key] = el; }}
                  >
                    <button
                      onClick={() => toggleTooltip(metric.key)}
                      className={`text-center transition-all hover:scale-105 ${theme === 'dark' ? 'hover:bg-gray-700/30' : 'hover:bg-gray-100/50'} rounded-lg px-3 py-2 cursor-pointer`}
                    >
                      {(() => {
                        const TrendIcon = trending.ArrowIcon;
                        return (
                          <div className="flex flex-col items-center gap-1">
                            <TrendIcon className={`w-8 h-8 ${trending.color}`} strokeWidth={2.5} />
                            <div className={`text-sm md:text-base font-bold ${trending.color}`}>
                              {trending.label}
                            </div>
                          </div>
                        );
                      })()}
                    </button>

                    {showTooltip && (
                      <div className={`absolute z-[9999] bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-80 rounded-lg shadow-2xl border animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-white border-gray-200'
                      }`}>
                        <div className="p-4 space-y-2">
                          <div className={`text-center flex items-center justify-center gap-2`}>
                            {(() => {
                              const TrendIcon = trending.ArrowIcon;
                              return (
                                <>
                                  <TrendIcon className={`w-5 h-5 ${trending.color}`} strokeWidth={2.5} />
                                  <span className={`text-lg font-bold ${trending.color}`}>
                                    {trending.label}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                            {trending.explanation}
                          </div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} italic mt-2 pt-2 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                            Based on YoY change, 3-month momentum, historical growth, and rising stars count.
                          </div>
                        </div>
                        <div
                          className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent ${
                            theme === 'dark' ? 'border-t-gray-700' : 'border-t-gray-200'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                ) : isInterestScore ? (
                  <div
                    className="relative"
                    ref={(el) => { tooltipRefs.current[metric.key] = el; }}
                  >
                    <button
                      onClick={() => toggleTooltip(metric.key)}
                      className={`text-center transition-all hover:scale-105 ${theme === 'dark' ? 'hover:bg-gray-700/30' : 'hover:bg-gray-100/50'} rounded-lg px-3 py-2 cursor-pointer`}
                    >
                      <div className={`text-lg md:text-xl font-bold ${getInterestLevelColor(value)}`}>
                        {value > 0 ? getInterestLevel(value) : 'N/A'}
                      </div>
                    </button>

                    {showTooltip && value > 0 && (
                      <div className={`absolute z-[9999] bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-64 rounded-lg shadow-2xl border animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-white border-gray-200'
                      }`}>
                        <div className="p-4 space-y-2">
                          <div className={`text-center text-xl font-bold ${getInterestLevelColor(value)}`}>
                            Score: {value.toFixed(1)}/50
                          </div>
                          <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-center leading-relaxed`}>
                            {getInterestExplanation(value)}
                          </div>
                        </div>
                        <div
                          className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent ${
                            theme === 'dark' ? 'border-t-gray-700' : 'border-t-gray-200'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                ) : isDemandScore ? (
                  <div
                    className="relative"
                    ref={(el) => { tooltipRefs.current[metric.key] = el; }}
                  >
                    <button
                      onClick={() => toggleTooltip(metric.key)}
                      className={`text-center transition-all hover:scale-105 ${theme === 'dark' ? 'hover:bg-gray-700/30' : 'hover:bg-gray-100/50'} rounded-lg px-3 py-2 cursor-pointer`}
                    >
                      <div className={`text-lg md:text-xl font-bold ${getDemandLevelColor(value)}`}>
                        {value > 0 ? getDemandLevel(value) : 'N/A'}
                      </div>
                    </button>

                    {showTooltip && value > 0 && (
                      <div className={`absolute z-[9999] bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-64 rounded-lg shadow-2xl border animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-white border-gray-200'
                      }`}>
                        <div className="p-4 space-y-2">
                          <div className={`text-center text-xl font-bold ${getDemandLevelColor(value)}`}>
                            Score: {value.toFixed(1)}/50
                          </div>
                          <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-center leading-relaxed`}>
                            {getDemandExplanation(value)}
                          </div>
                        </div>
                        <div
                          className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent ${
                            theme === 'dark' ? 'border-t-gray-700' : 'border-t-gray-200'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <div className={`text-xl md:text-2xl font-bold ${textColor}`}>
                      {formattedValue}
                    </div>
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
