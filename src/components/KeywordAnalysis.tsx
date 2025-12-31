import React, { useMemo } from 'react';
import { AlertCircle, TrendingUp, TrendingDown, Minus, Target, Award, Zap } from 'lucide-react';
import AdvertisingRecommendations from './AdvertisingRecommendations';

interface KeywordData {
  keyword: string;
  'Avg. monthly searches': number;
  'Competition (indexed value)'?: number;
  'Top of page bid (low range)'?: number;
  'Top of page bid (high range)'?: number;
  Competition?: string;
}

interface KeywordAnalysisProps {
  keywords: KeywordData[];
  theme?: 'dark' | 'light';
  brandName?: string;
}

interface DuplicateGroup {
  base: string;
  variants: string[];
  totalVolume: number;
}

interface KeywordPattern {
  type: string;
  keywords: string[];
  avgVolume: number;
  color: string;
}

interface VolumeSegment {
  range: string;
  count: number;
  percentage: number;
  avgVolume: number;
}

export default function KeywordAnalysis({ keywords, theme = 'light', brandName = '' }: KeywordAnalysisProps) {
  const analysis = useMemo(() => {
    if (!keywords.length) return null;

    const volumes = keywords
      .map(k => k['Avg. monthly searches'])
      .filter(v => v > 0)
      .sort((a, b) => a - b);

    const competitionValues = keywords
      .map(k => k['Competition (indexed value)'])
      .filter(v => v !== undefined && v > 0) as number[];

    const totalVolume = volumes.reduce((sum, v) => sum + v, 0);
    const avgVolume = Math.round(totalVolume / volumes.length);
    const medianVolume = volumes[Math.floor(volumes.length / 2)];
    const maxVolume = volumes[volumes.length - 1];
    const minVolume = volumes[0];

    const q1 = volumes[Math.floor(volumes.length * 0.25)];
    const q3 = volumes[Math.floor(volumes.length * 0.75)];
    const iqr = q3 - q1;

    const topKeywords = keywords
      .sort((a, b) => b['Avg. monthly searches'] - a['Avg. monthly searches'])
      .slice(0, 10);

    const lowCompetitionGems = keywords
      .filter(k => {
        const comp = k['Competition (indexed value)'];
        const vol = k['Avg. monthly searches'];
        return comp !== undefined && comp < 30 && vol > avgVolume * 0.5;
      })
      .sort((a, b) => b['Avg. monthly searches'] - a['Avg. monthly searches'])
      .slice(0, 5);

    const findDuplicates = (): DuplicateGroup[] => {
      const groups = new Map<string, string[]>();

      keywords.forEach(kw => {
        const normalized = kw.keyword.toLowerCase().trim();
        const words = normalized.split(/\s+/).sort();
        const baseKey = words.slice(0, 3).join(' ');

        if (!groups.has(baseKey)) {
          groups.set(baseKey, []);
        }
        groups.get(baseKey)!.push(kw.keyword);
      });

      return Array.from(groups.entries())
        .filter(([_, variants]) => variants.length > 1)
        .map(([base, variants]) => {
          const totalVolume = variants.reduce((sum, v) => {
            const kw = keywords.find(k => k.keyword === v);
            return sum + (kw?.['Avg. monthly searches'] || 0);
          }, 0);
          return { base, variants, totalVolume };
        })
        .sort((a, b) => b.totalVolume - a.totalVolume)
        .slice(0, 5);
    };

    const detectPatterns = (): KeywordPattern[] => {
      const patterns: KeywordPattern[] = [];

      const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which'];
      const buyingWords = ['buy', 'price', 'cost', 'cheap', 'deal', 'discount', 'shop'];
      const comparisonWords = ['vs', 'versus', 'compare', 'alternative', 'best', 'top'];

      const questionKws = keywords.filter(k =>
        questionWords.some(q => k.keyword.toLowerCase().includes(q))
      );
      if (questionKws.length > 0) {
        patterns.push({
          type: 'Question/Informational',
          keywords: questionKws.slice(0, 5).map(k => k.keyword),
          avgVolume: Math.round(questionKws.reduce((s, k) => s + k['Avg. monthly searches'], 0) / questionKws.length),
          color: 'blue'
        });
      }

      const buyingKws = keywords.filter(k =>
        buyingWords.some(b => k.keyword.toLowerCase().includes(b))
      );
      if (buyingKws.length > 0) {
        patterns.push({
          type: 'Commercial/Buying Intent',
          keywords: buyingKws.slice(0, 5).map(k => k.keyword),
          avgVolume: Math.round(buyingKws.reduce((s, k) => s + k['Avg. monthly searches'], 0) / buyingKws.length),
          color: 'green'
        });
      }

      const comparisonKws = keywords.filter(k =>
        comparisonWords.some(c => k.keyword.toLowerCase().includes(c))
      );
      if (comparisonKws.length > 0) {
        patterns.push({
          type: 'Comparison',
          keywords: comparisonKws.slice(0, 5).map(k => k.keyword),
          avgVolume: Math.round(comparisonKws.reduce((s, k) => s + k['Avg. monthly searches'], 0) / comparisonKws.length),
          color: 'purple'
        });
      }

      const longTailKws = keywords.filter(k => k.keyword.split(' ').length >= 4);
      if (longTailKws.length > 0) {
        patterns.push({
          type: 'Long-tail (4+ words)',
          keywords: longTailKws.slice(0, 5).map(k => k.keyword),
          avgVolume: Math.round(longTailKws.reduce((s, k) => s + k['Avg. monthly searches'], 0) / longTailKws.length),
          color: 'orange'
        });
      }

      return patterns;
    };

    const segmentByVolume = (): VolumeSegment[] => {
      const segments = [
        { range: '10K+', min: 10000, max: Infinity },
        { range: '1K-10K', min: 1000, max: 10000 },
        { range: '100-1K', min: 100, max: 1000 },
        { range: '10-100', min: 10, max: 100 },
        { range: '0-10', min: 0, max: 10 }
      ];

      return segments.map(seg => {
        const kws = keywords.filter(k => {
          const vol = k['Avg. monthly searches'];
          return vol >= seg.min && vol < seg.max;
        });

        const segVol = kws.reduce((sum, k) => sum + k['Avg. monthly searches'], 0);
        const avgVol = kws.length > 0 ? Math.round(segVol / kws.length) : 0;

        return {
          range: seg.range,
          count: kws.length,
          percentage: Math.round((kws.length / keywords.length) * 100),
          avgVolume: avgVol
        };
      }).filter(s => s.count > 0);
    };

    return {
      stats: {
        total: keywords.length,
        totalVolume,
        avgVolume,
        medianVolume,
        maxVolume,
        minVolume,
        q1,
        q3
      },
      topKeywords,
      lowCompetitionGems,
      duplicates: findDuplicates(),
      patterns: detectPatterns(),
      volumeSegments: segmentByVolume(),
      avgCompetition: competitionValues.length > 0
        ? (competitionValues.reduce((s, v) => s + v, 0) / competitionValues.length).toFixed(1)
        : 'N/A'
    };
  }, [keywords]);

  if (!analysis) {
    return (
      <div className={`rounded-lg p-6 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>No data available for analysis</p>
      </div>
    );
  }

  const getColorClasses = (color: string) => {
    const colors = {
      blue: theme === 'dark' ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200',
      green: theme === 'dark' ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-green-50 text-green-700 border-green-200',
      purple: theme === 'dark' ? 'bg-purple-900/30 text-purple-400 border-purple-800' : 'bg-purple-50 text-purple-700 border-purple-200',
      orange: theme === 'dark' ? 'bg-orange-900/30 text-orange-400 border-orange-800' : 'bg-orange-50 text-orange-700 border-orange-200'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-lg p-6 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Keyword Analysis
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Keywords</div>
            <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {analysis.stats.total.toLocaleString()}
            </div>
          </div>

          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Avg Volume</div>
            <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {analysis.stats.avgVolume.toLocaleString()}
            </div>
          </div>

          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Median Volume</div>
            <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {analysis.stats.medianVolume.toLocaleString()}
            </div>
          </div>

          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Avg Competition</div>
            <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {analysis.avgCompetition}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              <Award className="w-5 h-5" />
              Top 10 Keywords by Volume
            </h3>
            <div className="space-y-2">
              {analysis.topKeywords.map((kw, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-2 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`text-xs font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {i + 1}
                    </span>
                    <span className={`text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {kw.keyword}
                    </span>
                  </div>
                  <span className={`text-sm font-semibold ml-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                    {kw['Avg. monthly searches'].toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {analysis.lowCompetitionGems.length > 0 && (
            <div>
              <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <Zap className="w-5 h-5 text-yellow-500" />
                Low Competition Opportunities
              </h3>
              <div className={`mb-2 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                High volume keywords with competition index below 30
              </div>
              <div className="space-y-2">
                {analysis.lowCompetitionGems.map((kw, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2 rounded border ${theme === 'dark' ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'}`}
                  >
                    <span className={`text-sm truncate flex-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {kw.keyword}
                    </span>
                    <div className="flex items-center gap-2 ml-2">
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Vol: {kw['Avg. monthly searches'].toLocaleString()}
                      </span>
                      <span className={`text-xs ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'}`}>
                        Comp: {kw['Competition (indexed value)']?.toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {analysis.duplicates.length > 0 && (
        <div className={`rounded-lg p-6 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <AlertCircle className="w-5 h-5" />
            Potential Duplicates
          </h3>
          <div className={`mb-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Keywords with similar word patterns that could be merged
          </div>
          <div className="space-y-3">
            {analysis.duplicates.map((group, i) => (
              <div
                key={i}
                className={`p-3 rounded border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
              >
                <div className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Group {i + 1} - Combined Volume: {group.totalVolume.toLocaleString()}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.variants.map((v, j) => (
                    <span
                      key={j}
                      className={`text-xs px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.patterns.length > 0 && (
        <div className={`rounded-lg p-6 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <Target className="w-5 h-5" />
            Keyword Intent Patterns
          </h3>
          <div className={`mb-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Automatically categorized by search intent
          </div>
          <div className="space-y-3">
            {analysis.patterns.map((pattern, i) => (
              <div
                key={i}
                className={`p-3 rounded border ${getColorClasses(pattern.color)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{pattern.type}</span>
                  <span className="text-xs">Avg: {pattern.avgVolume.toLocaleString()}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pattern.keywords.map((kw, j) => (
                    <span
                      key={j}
                      className={`text-xs px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-white'}`}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`rounded-lg p-6 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          <TrendingUp className="w-5 h-5" />
          Volume Distribution
        </h3>
        <div className="space-y-2">
          {analysis.volumeSegments.map((seg, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {seg.range} searches/month
                </span>
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {seg.count} keywords ({seg.percentage}%)
                </span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${seg.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <AdvertisingRecommendations
        keywordData={keywords}
        brandName={brandName}
        theme={theme}
      />
    </div>
  );
}
