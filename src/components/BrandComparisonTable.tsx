import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Search, Target, Minus, Trophy, Zap, ThumbsUp, Sparkles, ArrowUp, ArrowUpRight, ArrowRight, ArrowDownRight, ArrowDown, Rocket } from 'lucide-react';
import { formatCompactNumber } from '../utils/formatNumber';
import { getBrandColor } from './BrandSelector';

interface BrandStats {
  brand: string;
  brandSearchVolume: number;
  totalKeywords: number;
  totalVolume: number;
  threeMonthChange: number;
  yoyChange: number;
  avgSentiment: number;
  avgDemandScore: number;
  avgInterestScore: number;
  avgSlope: number;
  avgRSquared: number;
  risingStarsHistorical: number;
  topPerformers: number;
  risingStars: number;
  declining: number;
  stable: number;
  highIntent: number;
}

interface BrandComparisonTableProps {
  brandStats: BrandStats[];
  availableBrands: string[];
  theme: 'light' | 'dark';
}

export default function BrandComparisonTable({ brandStats, availableBrands, theme }: BrandComparisonTableProps) {
  const [tooltipBrand, setTooltipBrand] = useState<string | null>(null);
  const [tooltipMetric, setTooltipMetric] = useState<string | null>(null);
  const tooltipRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipBrand) {
        const tooltipKey = `${tooltipBrand}-${tooltipMetric}`;
        const tooltipElement = tooltipRefs.current[tooltipKey];
        if (tooltipElement && !tooltipElement.contains(event.target as Node)) {
          setTooltipBrand(null);
          setTooltipMetric(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tooltipBrand, tooltipMetric]);

  if (brandStats.length < 2) return null;

  const toggleTooltip = (brand: string, metric: string) => {
    if (tooltipBrand === brand && tooltipMetric === metric) {
      setTooltipBrand(null);
      setTooltipMetric(null);
    } else {
      setTooltipBrand(brand);
      setTooltipMetric(metric);
    }
  };

  const calculateTrending = (stats: BrandStats): { ArrowIcon: any; label: string; level: number; color: string; explanation: string } => {
    const yoyChange = stats.yoyChange || 0;
    const threeMonthChange = stats.threeMonthChange || 0;
    const risingStarsHist = stats.risingStarsHistorical || 0;
    const avgSlope = stats.avgSlope || 0;
    const rSquared = stats.avgRSquared || 0;

    let level = 0;
    let ArrowIcon = ArrowRight;
    let label = 'Stable';
    let color = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

    // Step 1: Base direction from YoY Change
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

    // Step 2: Momentum modifier (compare 3-month to YoY)
    const momentumDiff = threeMonthChange - yoyChange;
    if (momentumDiff > 0.15 && level < 5) {
      level += 1;
    } else if (momentumDiff < -0.15 && level > 0) {
      level -= 1;
    }

    // Step 3: Intensity boost
    if (risingStarsHist > 400 && threeMonthChange > 0.30) {
      level = 5;
    }

    if (avgSlope > 0.07 && level === 5) {
      label = 'Explosive Up';
    }

    // Map final level to icon and label
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

    // Build explanation with trend reliability
    const reliabilityPercent = (rSquared * 100).toFixed(0);
    const explanation = `YoY: ${formatPercentage(yoyChange)} | 3M: ${formatPercentage(threeMonthChange)} | Historical Growth: ${formatMonthlyGrowth(avgSlope)} | Rising Stars: ${risingStarsHist} | Trend Reliability: ${reliabilityPercent}% confidence`;

    return { ArrowIcon, label, level, color, explanation };
  };

  const getIntensityBoost = (stats: BrandStats): { hasBoost: boolean; level: 'high' | 'extreme' | null; reason: string } => {
    const slope = stats.avgSlope || 0;
    const rSquared = stats.avgRSquared || 0;
    const risingStarsHist = stats.risingStarsHistorical || 0;
    const threeMonthChange = stats.threeMonthChange || 0;

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

  const getDemandScoreColor = (value: number) => {
    if (value >= 40) return 'text-green-500';
    if (value >= 30) return 'text-blue-500';
    if (value >= 20) return 'text-yellow-500';
    return theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  };

  const getInterestScoreColor = (value: number) => {
    if (value >= 40) return 'text-purple-500';
    if (value >= 30) return 'text-indigo-500';
    if (value >= 20) return 'text-pink-500';
    return theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  };

  const formatMonthlyGrowth = (slope: number): string => {
    if (slope === 0) return 'Flat';
    const pct = (slope * 100).toFixed(2);
    return slope > 0 ? `+${pct}%` : `${pct}%`;
  };

  const metrics = [
    { label: 'Trending', icon: TrendingUp, key: 'trending', format: (v: number) => '', colorize: 'trending' },
    { label: 'Monthly Search', icon: TrendingUp, key: 'brandSearchVolume', format: (v: number) => formatCompactNumber(v) },
    { label: 'Total Keywords', icon: Search, key: 'totalKeywords', format: (v: number) => formatCompactNumber(v) },
    { label: 'Targeted Reach', icon: TrendingUp, key: 'totalVolume', format: (v: number) => formatCompactNumber(v) },
    { label: 'Customer Demand', icon: Zap, key: 'avgDemandScore', format: (v: number) => v > 0 ? `${v.toFixed(1)}/50` : 'N/A', colorize: 'demand' },
    { label: 'Customer Interest', icon: Sparkles, key: 'avgInterestScore', format: (v: number) => v > 0 ? `${v.toFixed(1)}/50` : 'N/A', colorize: 'interest' },
    { label: '3-Month Change', icon: TrendingUp, key: 'threeMonthChange', format: (v: number) => formatPercentage(v), colorize: true },
    { label: 'YoY Change', icon: TrendingUp, key: 'yoyChange', format: (v: number) => formatPercentage(v), colorize: true },
    { label: 'Sentiment', icon: ThumbsUp, key: 'avgSentiment', format: (v: number) => formatSentiment(v), colorize: 'sentiment' },
    { label: 'Top Performers', icon: Trophy, key: 'topPerformers', format: (v: number) => formatCompactNumber(v) },
    { label: 'Rising Stars', icon: Zap, key: 'risingStars', format: (v: number) => formatCompactNumber(v) },
    { label: 'Historical Stars', icon: Zap, key: 'risingStarsHistorical', format: (v: number) => formatCompactNumber(v) },
    { label: 'Declining', icon: TrendingDown, key: 'declining', format: (v: number) => formatCompactNumber(v) },
    { label: 'Stable', icon: Minus, key: 'stable', format: (v: number) => formatCompactNumber(v) },
    { label: 'High Intent', icon: Target, key: 'highIntent', format: (v: number) => formatCompactNumber(v) },
  ];

  return (
    <div className={`mb-6 rounded-xl border ${theme === 'dark' ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700' : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'}`}>
      <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-orange-50'} overflow-hidden rounded-t-xl`}>
        <div className="flex items-center justify-center">
          <div className={`px-6 py-2 rounded-full ${theme === 'dark' ? 'bg-orange-600' : 'bg-orange-500'} border-4 ${theme === 'dark' ? 'border-gray-700' : 'border-orange-600'}`}>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-wider">
              BRAND COMPARE
            </h2>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-visible">
        <div className="min-w-[600px]">
          <div className={`grid gap-0 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`} style={{ gridTemplateColumns: `repeat(${brandStats.length + 1}, 1fr)` }}>
            <div className={`p-4 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'}`}></div>
            {brandStats.map((stats, index) => {
              const brandColor = getBrandColor(stats.brand, availableBrands);
              const intensityBoost = getIntensityBoost(stats);

              return (
                <div
                  key={stats.brand}
                  className={`p-4 text-center border-l ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} relative`}
                  style={{
                    background: theme === 'dark'
                      ? `linear-gradient(135deg, ${brandColor}20, ${brandColor}10)`
                      : `linear-gradient(135deg, ${brandColor}15, ${brandColor}05)`
                  }}
                >
                  <div className="relative inline-block">
                    <div
                      className="text-lg md:text-xl font-black uppercase tracking-wide px-4 py-2 rounded-full inline-block"
                      style={{
                        background: brandColor,
                        color: 'white'
                      }}
                    >
                      {stats.brand}
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

                  {intensityBoost.hasBoost && (
                    <div className={`text-xs mt-2 px-2 py-1 rounded ${
                      intensityBoost.level === 'extreme'
                        ? theme === 'dark' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                        : theme === 'dark' ? 'bg-orange-900/40 text-orange-300' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {intensityBoost.level === 'extreme' ? 'Explosive Growth' : 'Strong Momentum'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {metrics.map((metric, metricIndex) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.key}
                className={`grid gap-0 border-b ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'} hover:${theme === 'dark' ? 'bg-gray-700/20' : 'bg-gray-50'} transition-colors overflow-visible`}
                style={{ gridTemplateColumns: `repeat(${brandStats.length + 1}, 1fr)` }}
              >
                <div className={`p-4 flex items-center gap-3 ${theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50/50'}`}>
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>
                    <Icon className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`} />
                  </div>
                  <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {metric.label}
                  </span>
                </div>

                {brandStats.map((stats) => {
                  const value = (stats as any)[metric.key];
                  const formattedValue = metric.format(value, stats);

                  let textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';
                  if (metric.colorize === true) {
                    textColor = getTrendColor(value);
                  } else if (metric.colorize === 'sentiment') {
                    textColor = getSentimentColor(value);
                  } else if (metric.colorize === 'demand') {
                    textColor = getDemandScoreColor(value);
                  } else if (metric.colorize === 'interest') {
                    textColor = getInterestScoreColor(value);
                  }

                  const isTrending = metric.key === 'trending';
                  const isInterestScore = metric.key === 'avgInterestScore';
                  const isDemandScore = metric.key === 'avgDemandScore';
                  const showTooltip = tooltipBrand === stats.brand && tooltipMetric === metric.key;

                  return (
                    <div
                      key={`${stats.brand}-${metric.key}`}
                      className={`p-4 flex items-center justify-center border-l ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'} relative`}
                    >
                      {isTrending ? (
                        <div
                          className="relative"
                          ref={(el) => { tooltipRefs.current[`${stats.brand}-${metric.key}`] = el; }}
                        >
                          <button
                            onClick={() => toggleTooltip(stats.brand, metric.key)}
                            className={`text-center transition-all hover:scale-105 ${theme === 'dark' ? 'hover:bg-gray-700/30' : 'hover:bg-gray-100/50'} rounded-lg px-3 py-2 cursor-pointer`}
                          >
                            {(() => {
                              const trending = calculateTrending(stats);
                              const Icon = trending.ArrowIcon;
                              return (
                                <div className="flex flex-col items-center gap-1">
                                  <Icon className={`w-8 h-8 ${trending.color}`} strokeWidth={2.5} />
                                  <div className={`text-sm md:text-base font-bold ${trending.color}`}>
                                    {trending.label}
                                  </div>
                                </div>
                              );
                            })()}
                          </button>

                          {showTooltip && (
                            <div className={`absolute z-[9999] bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-80 rounded-lg shadow-2xl border-2 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                              theme === 'dark'
                                ? 'bg-gray-800 border-gray-600'
                                : 'bg-white border-gray-300'
                            }`}>
                              <div className="p-4 space-y-2">
                                <div className={`text-center flex items-center justify-center gap-2`}>
                                  {(() => {
                                    const trending = calculateTrending(stats);
                                    const Icon = trending.ArrowIcon;
                                    return (
                                      <>
                                        <Icon className={`w-5 h-5 ${trending.color}`} strokeWidth={2.5} />
                                        <span className={`text-lg font-bold ${trending.color}`}>
                                          {trending.label}
                                        </span>
                                      </>
                                    );
                                  })()}
                                </div>
                                <div className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                                  {calculateTrending(stats).explanation}
                                </div>
                                <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} italic mt-2 pt-2 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                                  Based on YoY change, 3-month momentum, historical growth, and rising stars count.
                                </div>
                              </div>
                              <div
                                className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent ${
                                  theme === 'dark' ? 'border-t-gray-600' : 'border-t-gray-300'
                                }`}
                              />
                            </div>
                          )}
                        </div>
                      ) : isInterestScore ? (
                        <div
                          className="relative"
                          ref={(el) => { tooltipRefs.current[`${stats.brand}-${metric.key}`] = el; }}
                        >
                          <button
                            onClick={() => toggleTooltip(stats.brand, metric.key)}
                            className={`text-center transition-all hover:scale-105 ${theme === 'dark' ? 'hover:bg-gray-700/30' : 'hover:bg-gray-100/50'} rounded-lg px-3 py-2 cursor-pointer`}
                          >
                            <div className={`text-lg md:text-xl font-bold ${getInterestLevelColor(value)}`}>
                              {value > 0 ? getInterestLevel(value) : 'N/A'}
                            </div>
                          </button>

                          {showTooltip && value > 0 && (
                            <div className={`absolute z-[9999] bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-64 rounded-lg shadow-2xl border-2 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                              theme === 'dark'
                                ? 'bg-gray-800 border-gray-600'
                                : 'bg-white border-gray-300'
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
                                  theme === 'dark' ? 'border-t-gray-600' : 'border-t-gray-300'
                                }`}
                              />
                            </div>
                          )}
                        </div>
                      ) : isDemandScore ? (
                        <div
                          className="relative"
                          ref={(el) => { tooltipRefs.current[`${stats.brand}-${metric.key}`] = el; }}
                        >
                          <button
                            onClick={() => toggleTooltip(stats.brand, metric.key)}
                            className={`text-center transition-all hover:scale-105 ${theme === 'dark' ? 'hover:bg-gray-700/30' : 'hover:bg-gray-100/50'} rounded-lg px-3 py-2 cursor-pointer`}
                          >
                            <div className={`text-lg md:text-xl font-bold ${getDemandLevelColor(value)}`}>
                              {value > 0 ? getDemandLevel(value) : 'N/A'}
                            </div>
                          </button>

                          {showTooltip && value > 0 && (
                            <div className={`absolute z-[9999] bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-64 rounded-lg shadow-2xl border-2 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                              theme === 'dark'
                                ? 'bg-gray-800 border-gray-600'
                                : 'bg-white border-gray-300'
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
                                  theme === 'dark' ? 'border-t-gray-600' : 'border-t-gray-300'
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
                          {(metric.key === 'topPerformers' || metric.key === 'risingStars' || metric.key === 'risingStarsHistorical' || metric.key === 'declining' || metric.key === 'stable' || metric.key === 'highIntent') && (
                            <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                              keywords
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function calculateBrandStats(keywordData: any[], brand: string, brandPageData?: { brand: string; avg_monthly_searches?: number }[]): BrandStats {
  const brandKeywords = keywordData.filter(kw => kw.brand === brand);

  // Get brand search volume from brand pages
  const brandPage = brandPageData?.find(page => page.brand === brand);
  const brandSearchVolume = brandPage?.avg_monthly_searches || 0;

  const parseNumericValue = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const totalKeywords = brandKeywords.length;
  const totalVolume = brandKeywords.reduce((sum, kw) => sum + (kw['Avg. monthly searches'] || 0), 0);

  const threeMonthValues = brandKeywords
    .map(kw => parseNumericValue(kw['Three month change']))
    .filter(v => v !== 0);
  const threeMonthChange = threeMonthValues.length > 0
    ? threeMonthValues.reduce((sum, v) => sum + v, 0) / threeMonthValues.length
    : 0;

  const yoyValues = brandKeywords
    .map(kw => parseNumericValue(kw['YoY change']))
    .filter(v => v !== 0);
  const yoyChange = yoyValues.length > 0
    ? yoyValues.reduce((sum, v) => sum + v, 0) / yoyValues.length
    : 0;

  const sentimentValues = brandKeywords
    .map(kw => parseNumericValue(kw.sentiment))
    .filter(v => v !== 0);
  const avgSentiment = sentimentValues.length > 0
    ? sentimentValues.reduce((sum, v) => sum + v, 0) / sentimentValues.length
    : 0;

  const demandScoreValues = brandKeywords
    .map(kw => parseNumericValue(kw.demand_score))
    .filter(v => v !== 0);
  const avgDemandScore = demandScoreValues.length > 0
    ? demandScoreValues.reduce((sum, v) => sum + v, 0) / demandScoreValues.length
    : 0;

  const interestScoreValues = brandKeywords
    .map(kw => parseNumericValue(kw.interest_score))
    .filter(v => v !== 0);
  const avgInterestScore = interestScoreValues.length > 0
    ? interestScoreValues.reduce((sum, v) => sum + v, 0) / interestScoreValues.length
    : 0;

  const topPerformers = brandKeywords.filter(kw => {
    const volume = kw['Avg. monthly searches'] || 0;
    const comp = parseNumericValue(kw['Competition (indexed value)']);
    return volume > 1000 && comp < 0.5;
  }).length;

  const risingStars = brandKeywords.filter(kw => {
    const threeMonth = parseNumericValue(kw['Three month change']);
    const yoy = parseNumericValue(kw['YoY change']);
    return threeMonth > 0.2 || yoy > 0.5;
  }).length;

  const declining = brandKeywords.filter(kw => {
    const threeMonth = parseNumericValue(kw['Three month change']);
    return threeMonth < -0.1;
  }).length;

  const stable = brandKeywords.filter(kw => {
    const threeMonth = parseNumericValue(kw['Three month change']);
    return threeMonth >= -0.1 && threeMonth <= 0.1;
  }).length;

  const highIntent = brandKeywords.filter(kw => {
    const comp = parseNumericValue(kw['Competition (indexed value)']);
    return comp > 0.7;
  }).length;

  return {
    brand,
    brandSearchVolume,
    totalKeywords,
    totalVolume,
    threeMonthChange,
    yoyChange,
    avgSentiment,
    avgDemandScore,
    avgInterestScore,
    topPerformers,
    risingStars,
    declining,
    stable,
    highIntent
  };
}
