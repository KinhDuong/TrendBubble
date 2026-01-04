import { TrendingUp, TrendingDown, Search, DollarSign, Target, Star, AlertTriangle, Minus, Trophy, Zap, ThumbsUp } from 'lucide-react';
import { formatCompactNumber } from '../utils/formatNumber';
import { getBrandColor } from './BrandSelector';

interface BrandStats {
  brand: string;
  brandSearchVolume: number;
  totalKeywords: number;
  totalVolume: number;
  avgCompetition: number;
  avgCpcLow: number;
  avgCpcHigh: number;
  threeMonthChange: number;
  yoyChange: number;
  avgSentiment: number;
  topPerformers: number;
  risingStars: number;
  declining: number;
  stable: number;
  highVolumeLowComp: number;
  highIntent: number;
  competitive: number;
}

interface BrandComparisonTableProps {
  brandStats: BrandStats[];
  availableBrands: string[];
  theme: 'light' | 'dark';
}

export default function BrandComparisonTable({ brandStats, availableBrands, theme }: BrandComparisonTableProps) {
  if (brandStats.length < 2) return null;

  const formatCurrency = (low: number, high: number) => {
    if (low === 0 && high === 0) return 'N/A';
    return `$${low.toFixed(2)} - $${high.toFixed(2)}`;
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

  const metrics = [
    { label: 'Brand Search Volume', icon: TrendingUp, key: 'brandSearchVolume', format: (v: number) => formatCompactNumber(v) },
    { label: 'Total Keywords', icon: Search, key: 'totalKeywords', format: (v: number) => formatCompactNumber(v) },
    { label: 'Keyword Search Volume', icon: TrendingUp, key: 'totalVolume', format: (v: number) => formatCompactNumber(v) },
    { label: 'Avg. Competition', icon: Target, key: 'avgCompetition', format: (v: number) => v.toFixed(2) },
    { label: 'Avg. CPC Range', icon: DollarSign, key: 'cpc', format: (_: number, stats: BrandStats) => formatCurrency(stats.avgCpcLow, stats.avgCpcHigh) },
    { label: '3-Month Change', icon: TrendingUp, key: 'threeMonthChange', format: (v: number) => formatPercentage(v), colorize: true },
    { label: 'YoY Change', icon: TrendingUp, key: 'yoyChange', format: (v: number) => formatPercentage(v), colorize: true },
    { label: 'Sentiment', icon: ThumbsUp, key: 'avgSentiment', format: (v: number) => formatSentiment(v), colorize: 'sentiment' },
    { label: 'Top Performers', icon: Trophy, key: 'topPerformers', format: (v: number) => formatCompactNumber(v) },
    { label: 'Rising Stars', icon: Zap, key: 'risingStars', format: (v: number) => formatCompactNumber(v) },
    { label: 'Declining', icon: TrendingDown, key: 'declining', format: (v: number) => formatCompactNumber(v) },
    { label: 'Stable', icon: Minus, key: 'stable', format: (v: number) => formatCompactNumber(v) },
    { label: 'High Vol. Low Comp.', icon: Star, key: 'highVolumeLowComp', format: (v: number) => formatCompactNumber(v) },
    { label: 'High Intent', icon: Target, key: 'highIntent', format: (v: number) => formatCompactNumber(v) },
    { label: 'Competitive', icon: AlertTriangle, key: 'competitive', format: (v: number) => formatCompactNumber(v) },
  ];

  return (
    <div className={`mb-6 rounded-xl border ${theme === 'dark' ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700' : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'} overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-orange-50'}`}>
        <div className="flex items-center justify-center">
          <div className={`px-6 py-2 rounded-full ${theme === 'dark' ? 'bg-orange-600' : 'bg-orange-500'} border-4 ${theme === 'dark' ? 'border-gray-700' : 'border-orange-600'}`}>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-wider">
              BRAND COMPARE
            </h2>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className={`grid gap-0 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`} style={{ gridTemplateColumns: `repeat(${brandStats.length + 1}, 1fr)` }}>
            <div className={`p-4 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'}`}></div>
            {brandStats.map((stats, index) => {
              const brandColor = getBrandColor(stats.brand, availableBrands);
              return (
                <div
                  key={stats.brand}
                  className={`p-4 text-center border-l ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}
                  style={{
                    background: theme === 'dark'
                      ? `linear-gradient(135deg, ${brandColor}20, ${brandColor}10)`
                      : `linear-gradient(135deg, ${brandColor}15, ${brandColor}05)`
                  }}
                >
                  <div
                    className="text-lg md:text-xl font-black uppercase tracking-wide px-4 py-2 rounded-full inline-block"
                    style={{
                      background: brandColor,
                      color: 'white'
                    }}
                  >
                    {stats.brand}
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
                className={`grid gap-0 border-b ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'} hover:${theme === 'dark' ? 'bg-gray-700/20' : 'bg-gray-50'} transition-colors`}
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
                  const value = metric.key === 'cpc' ? 0 : (stats as any)[metric.key];
                  const formattedValue = metric.format(value, stats);

                  let textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';
                  if (metric.colorize === true) {
                    textColor = getTrendColor(value);
                  } else if (metric.colorize === 'sentiment') {
                    textColor = getSentimentColor(value);
                  }

                  return (
                    <div
                      key={`${stats.brand}-${metric.key}`}
                      className={`p-4 flex items-center justify-center border-l ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}
                    >
                      <div className="text-center">
                        <div className={`text-xl md:text-2xl font-bold ${textColor}`}>
                          {formattedValue}
                        </div>
                        {(metric.key === 'topPerformers' || metric.key === 'risingStars' || metric.key === 'declining' || metric.key === 'stable' || metric.key === 'highVolumeLowComp' || metric.key === 'highIntent' || metric.key === 'competitive') && (
                          <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                            keywords
                          </div>
                        )}
                      </div>
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

  const competitionValues = brandKeywords
    .map(kw => parseNumericValue(kw['Competition (indexed value)']))
    .filter(v => v > 0);
  const avgCompetition = competitionValues.length > 0
    ? competitionValues.reduce((sum, v) => sum + v, 0) / competitionValues.length
    : 0;

  const cpcLowValues = brandKeywords
    .map(kw => parseNumericValue(kw['Top of page bid (low range)']))
    .filter(v => v > 0);
  const avgCpcLow = cpcLowValues.length > 0
    ? cpcLowValues.reduce((sum, v) => sum + v, 0) / cpcLowValues.length
    : 0;

  const cpcHighValues = brandKeywords
    .map(kw => parseNumericValue(kw['Top of page bid (high range)']))
    .filter(v => v > 0);
  const avgCpcHigh = cpcHighValues.length > 0
    ? cpcHighValues.reduce((sum, v) => sum + v, 0) / cpcHighValues.length
    : 0;

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

  const highVolumeLowComp = brandKeywords.filter(kw => {
    const volume = kw['Avg. monthly searches'] || 0;
    const comp = parseNumericValue(kw['Competition (indexed value)']);
    return volume > 5000 && comp < 0.3;
  }).length;

  const highIntent = brandKeywords.filter(kw => {
    const comp = parseNumericValue(kw['Competition (indexed value)']);
    return comp > 0.7;
  }).length;

  const competitive = brandKeywords.filter(kw => {
    const comp = parseNumericValue(kw['Competition (indexed value)']);
    return comp > 0.7;
  }).length;

  return {
    brand,
    brandSearchVolume,
    totalKeywords,
    totalVolume,
    avgCompetition,
    avgCpcLow,
    avgCpcHigh,
    threeMonthChange,
    yoyChange,
    avgSentiment,
    topPerformers,
    risingStars,
    declining,
    stable,
    highVolumeLowComp,
    highIntent,
    competitive
  };
}
