import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCompactNumber } from '../utils/formatNumber';

interface BrandKeywordStatsProps {
  keyword: any;
  monthColumns: string[];
  theme: 'light' | 'dark';
}

export default function BrandKeywordStats({ keyword, monthColumns, theme }: BrandKeywordStatsProps) {
  if (!keyword) return null;

  const parseNumericValue = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const searchVolume = keyword['Avg. monthly searches'] || 0;
  const competition = parseNumericValue(keyword['Competition (indexed value)']);
  const lowTopBid = parseNumericValue(keyword['Top of page bid (low range)']);
  const highTopBid = parseNumericValue(keyword['Top of page bid (high range)']);
  const yoyChange = parseNumericValue(keyword['YoY change']);
  const threeMonthChange = parseNumericValue(keyword['Three month change']);

  const formatCurrency = (value: number) => {
    if (value === 0) return 'N/A';
    return `$${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    if (value === 0) return '0%';
    const formatted = (value * 100).toFixed(0);
    return value > 0 ? `+${formatted}%` : `${formatted}%`;
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  };

  const monthlyData = monthColumns
    .map(col => ({
      month: col,
      volume: keyword[col]
    }))
    .filter(item => item.volume !== null && item.volume !== undefined)
    .slice(-12);

  return (
    <div className={`mb-6 rounded-xl border ${theme === 'dark' ? 'bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-800/30' : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'} p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
          <TrendingUp className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
        </div>
        <div>
          <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {keyword.keyword}
          </h2>
          {keyword.brand && (
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
              {keyword.brand}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className={`${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/60'} rounded-lg p-4 border ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}>
          <div className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Search Volume
          </div>
          <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {formatCompactNumber(searchVolume)}
          </div>
          <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            avg/month
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/60'} rounded-lg p-4 border ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}>
          <div className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Competition
          </div>
          <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {competition > 0 ? competition.toFixed(2) : 'N/A'}
          </div>
          <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            0-1 scale
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/60'} rounded-lg p-4 border ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}>
          <div className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            CPC Range
          </div>
          <div className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {lowTopBid > 0 || highTopBid > 0 ? (
              <>
                {formatCurrency(lowTopBid)}
                <span className="text-sm font-normal mx-1">-</span>
                {formatCurrency(highTopBid)}
              </>
            ) : (
              'N/A'
            )}
          </div>
          <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            top of page
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/60'} rounded-lg p-4 border ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}>
          <div className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            YoY Change
          </div>
          <div className={`text-2xl font-bold flex items-center gap-2 ${getTrendColor(yoyChange)}`}>
            {getTrendIcon(yoyChange)}
            {formatPercentage(yoyChange)}
          </div>
          <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            year-over-year
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/60'} rounded-lg p-4 border ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}>
          <div className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            3-Month Change
          </div>
          <div className={`text-2xl font-bold flex items-center gap-2 ${getTrendColor(threeMonthChange)}`}>
            {getTrendIcon(threeMonthChange)}
            {formatPercentage(threeMonthChange)}
          </div>
          <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            quarterly trend
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/60'} rounded-lg p-4 border ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}>
          <div className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Data Points
          </div>
          <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {monthlyData.length}
          </div>
          <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            months tracked
          </div>
        </div>
      </div>

      {monthlyData.length > 0 && (
        <div className="mt-6">
          <div className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Monthly Trend (Last 12 Months)
          </div>
          <div className="flex items-end gap-1 h-24">
            {monthlyData.map((item, index) => {
              const maxVolume = Math.max(...monthlyData.map(d => d.volume));
              const height = (item.volume / maxVolume) * 100;

              return (
                <div key={index} className="flex-1 flex flex-col items-center group relative">
                  <div
                    className={`w-full rounded-t transition-all ${theme === 'dark' ? 'bg-blue-500/60 group-hover:bg-blue-400' : 'bg-blue-600 group-hover:bg-blue-700'}`}
                    style={{ height: `${height}%`, minHeight: '4px' }}
                  />
                  <div className={`absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${theme === 'dark' ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300 shadow-sm'}`}>
                    {formatCompactNumber(item.volume)}
                  </div>
                  <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                    {item.month.split(' ')[0]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
