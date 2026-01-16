import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Search, Target, DollarSign, Trophy, Zap, ThumbsUp, Sparkles, ArrowUp, ArrowUpRight, ArrowRight, ArrowDownRight, ArrowDown, Rocket } from 'lucide-react';
import { formatCompactNumber } from '../utils/formatNumber';

interface KeywordStats {
  keyword: string;
  brand: string;
  avgMonthlySearches: number;
  threeMonthChange: number;
  yoyChange: number;
  competition: string;
  competitionIndexed: number;
  topBidLow: number;
  topBidHigh: number;
  sentiment: number;
  demandScore: number;
  interestScore: number;
  intent: string;
  aiCategory: string;
}

interface KeywordComparisonTableProps {
  keywordStats: KeywordStats[];
  theme: 'light' | 'dark';
}

export default function KeywordComparisonTable({ keywordStats, theme }: KeywordComparisonTableProps) {
  const [tooltipKeyword, setTooltipKeyword] = useState<string | null>(null);
  const [tooltipMetric, setTooltipMetric] = useState<string | null>(null);
  const tooltipRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipKeyword) {
        const tooltipKey = `${tooltipKeyword}-${tooltipMetric}`;
        const tooltipElement = tooltipRefs.current[tooltipKey];
        if (tooltipElement && !tooltipElement.contains(event.target as Node)) {
          setTooltipKeyword(null);
          setTooltipMetric(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tooltipKeyword, tooltipMetric]);

  if (keywordStats.length < 2) return null;

  const toggleTooltip = (keyword: string, metric: string) => {
    if (tooltipKeyword === keyword && tooltipMetric === metric) {
      setTooltipKeyword(null);
      setTooltipMetric(null);
    } else {
      setTooltipKeyword(keyword);
      setTooltipMetric(metric);
    }
  };

  const getCompetitionColor = (competition: string) => {
    if (competition === 'HIGH') return 'text-red-500';
    if (competition === 'MEDIUM') return 'text-yellow-500';
    if (competition === 'LOW') return 'text-green-500';
    return theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  };

  const getIntentColor = (intent: string) => {
    if (intent === 'Commercial' || intent === 'Transactional') return 'text-green-500';
    if (intent === 'Navigational') return 'text-blue-500';
    if (intent === 'Informational') return 'text-purple-500';
    return theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
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

  const formatCurrency = (value: number) => {
    if (value === 0) return 'N/A';
    return `$${value.toFixed(2)}`;
  };

  const getKeywordColor = (index: number): string => {
    const colors = [
      '#3B82F6',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#8B5CF6',
      '#EC4899',
      '#14B8A6',
      '#F97316'
    ];
    return colors[index % colors.length];
  };

  const calculateTrending = (stats: KeywordStats): { ArrowIcon: any; label: string; level: number; color: string; explanation: string } => {
    const yoyChange = stats.yoyChange || 0;
    const threeMonthChange = stats.threeMonthChange || 0;

    // 70/30 Weighted: 70% recent momentum (3-month), 30% longer term (YoY)
    const weightedMomentum = (threeMonthChange * 0.7) + (yoyChange * 0.3);

    let level = 2; // default: stable
    let ArrowIcon = ArrowRight;
    let label = 'Stable';
    let color = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

    if (weightedMomentum > 0.30) {
      level = 5;
      ArrowIcon = Rocket;
      label = 'Explosive Up';
      color = 'text-emerald-500';
    } else if (weightedMomentum >= 0.15) {
      level = 4;
      ArrowIcon = ArrowUp;
      label = 'Strong Up';
      color = 'text-green-500';
    } else if (weightedMomentum >= 0.05) {
      level = 3;
      ArrowIcon = ArrowUpRight;
      label = 'Moderate Up';
      color = 'text-blue-500';
    } else if (weightedMomentum >= -0.05) {
      level = 2;
      ArrowIcon = ArrowRight;
      label = 'Stable';
      color = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    } else if (weightedMomentum >= -0.15) {
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

    const explanation = `3-Month (70%): ${formatPercentage(threeMonthChange)} | YoY (30%): ${formatPercentage(yoyChange)} | Weighted: ${(weightedMomentum * 100).toFixed(1)}% → ${label}`;

    return { ArrowIcon, label, level, color, explanation };
  };

  const metrics = [
    { label: 'Trending', icon: TrendingUp, key: 'trending', format: (v: number) => '', colorize: 'trending' },
    { label: 'Brand', icon: Target, key: 'brand', format: (v: string) => v },
    { label: 'Monthly Searches', icon: Search, key: 'avgMonthlySearches', format: (v: number) => formatCompactNumber(v) },
    { label: 'Demand', icon: Zap, key: 'demandScore', format: (v: number) => v > 0 ? `${v.toFixed(1)}/50` : 'N/A', colorize: 'demand' },
    { label: 'Interest', icon: Sparkles, key: 'interestScore', format: (v: number) => v > 0 ? `${v.toFixed(1)}/50` : 'N/A', colorize: 'interest' },
    { label: '3-Month Change', icon: TrendingUp, key: 'threeMonthChange', format: (v: number) => formatPercentage(v), colorize: true },
    { label: 'YoY Change', icon: TrendingUp, key: 'yoyChange', format: (v: number) => formatPercentage(v), colorize: true },
    { label: 'Competition', icon: Trophy, key: 'competition', format: (v: string) => v || 'N/A', colorize: 'competition' },
    { label: 'Competition Index', icon: Trophy, key: 'competitionIndexed', format: (v: number) => v > 0 ? v.toFixed(2) : 'N/A' },
    { label: 'CPC Low', icon: DollarSign, key: 'topBidLow', format: (v: number) => formatCurrency(v) },
    { label: 'CPC High', icon: DollarSign, key: 'topBidHigh', format: (v: number) => formatCurrency(v) },
    { label: 'Intent', icon: Target, key: 'intent', format: (v: string) => v || 'Unknown', colorize: 'intent' },
    { label: 'Sentiment', icon: ThumbsUp, key: 'sentiment', format: (v: number) => formatSentiment(v), colorize: 'sentiment' },
    { label: 'Category', icon: Search, key: 'aiCategory', format: (v: string) => v || 'Uncategorized' },
  ];

  return (
    <div className={`mb-6 rounded-xl border overflow-visible ${theme === 'dark' ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700' : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'}`}>
      <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-100'} overflow-visible rounded-t-xl`}>
        <div className="flex items-center justify-center">
          <h2 className="text-xl md:text-2xl font-black text-black tracking-wider">
            KEYWORD COMPARE
          </h2>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-visible">
        <div className="min-w-[600px]">
          <div className={`grid gap-0 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`} style={{ gridTemplateColumns: `repeat(${keywordStats.length + 1}, 1fr)` }}>
            <div className={`p-4 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'}`}></div>
            {keywordStats.map((stats, index) => {
              const keywordColor = getKeywordColor(index);

              return (
                <div
                  key={`${stats.keyword}-${stats.brand}`}
                  className={`p-4 text-center border-l ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} relative`}
                  style={{
                    background: theme === 'dark'
                      ? `linear-gradient(135deg, ${keywordColor}20, ${keywordColor}10)`
                      : `linear-gradient(135deg, ${keywordColor}15, ${keywordColor}05)`
                  }}
                >
                  <div className="relative inline-block">
                    <div
                      className="text-sm md:text-base font-bold px-4 py-2 rounded-full inline-block"
                      style={{
                        background: keywordColor,
                        color: 'white'
                      }}
                    >
                      {stats.keyword}
                    </div>
                  </div>
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
                style={{ gridTemplateColumns: `repeat(${keywordStats.length + 1}, 1fr)` }}
              >
                <div className={`p-4 flex items-center gap-3 ${theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50/50'}`}>
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>
                    <Icon className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`} />
                  </div>
                  <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {metric.label}
                  </span>
                </div>

                {keywordStats.map((stats) => {
                  const value = (stats as any)[metric.key];
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
                  } else if (metric.colorize === 'competition') {
                    textColor = getCompetitionColor(value);
                  } else if (metric.colorize === 'intent') {
                    textColor = getIntentColor(value);
                  }

                  const isTrending = metric.key === 'trending';
                  const isInterestScore = metric.key === 'interestScore';
                  const isDemandScore = metric.key === 'demandScore';
                  const showTooltip = tooltipKeyword === `${stats.keyword}-${stats.brand}` && tooltipMetric === metric.key;

                  return (
                    <div
                      key={`${stats.keyword}-${stats.brand}-${metric.key}`}
                      className={`p-4 flex items-center justify-center border-l ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'} relative`}
                    >
                      {isTrending ? (
                        <div
                          className="relative"
                          ref={(el) => { tooltipRefs.current[`${stats.keyword}-${stats.brand}-${metric.key}`] = el; }}
                        >
                          <button
                            onClick={() => toggleTooltip(`${stats.keyword}-${stats.brand}`, metric.key)}
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
                            <div className={`absolute z-[9999] bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-80 rounded-lg shadow-2xl border animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                              theme === 'dark'
                                ? 'bg-gray-800 border-gray-700'
                                : 'bg-white border-gray-200'
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
                                  Based on 3-month and year-over-year momentum trends.
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
                          ref={(el) => { tooltipRefs.current[`${stats.keyword}-${stats.brand}-${metric.key}`] = el; }}
                        >
                          <button
                            onClick={() => toggleTooltip(`${stats.keyword}-${stats.brand}`, metric.key)}
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
                          ref={(el) => { tooltipRefs.current[`${stats.keyword}-${stats.brand}-${metric.key}`] = el; }}
                        >
                          <button
                            onClick={() => toggleTooltip(`${stats.keyword}-${stats.brand}`, metric.key)}
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
                          <div className={`text-base md:text-lg font-bold ${textColor}`}>
                            {formattedValue}
                          </div>
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
