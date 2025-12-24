import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, Zap, Target, Shield, Award, DollarSign, Hash, Flame, TrendingDown } from 'lucide-react';

interface KeywordData {
  keyword: string;
  searchVolume: number;
  cpcLow?: number;
  cpcHigh?: number;
  competitionIndexed?: number;
  competition?: string;
  yoyChange?: string;
  threeMonthChange?: string;
}

interface ScoredKeyword extends KeywordData {
  score: number;
  normalizedVolume: number;
  normalizedCPC: number;
  normalizedGrowth: number;
  normalizedInvertedCompetition: number;
  avgCPC: number;
  growthRate: number;
}

interface CategoryResult {
  name: string;
  icon: React.ReactNode;
  description: string;
  keywords: ScoredKeyword[];
  color: string;
}

interface Props {
  keywordData: any[];
  brandName: string;
  theme: 'dark' | 'light';
}

export default function AdvertisingRecommendations({ keywordData, brandName, theme }: Props) {
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Highest ROI Potential');

  const processedData = useMemo(() => {
    if (!keywordData || keywordData.length === 0) return [];

    const processed: KeywordData[] = keywordData.map(kw => {
      const cpcLow = kw['Top of page bid (low range)'] || 0;
      const cpcHigh = kw['Top of page bid (high range)'] || 0;
      const competitionIndexed = kw['Competition (indexed value)'] || 0;
      const yoyChange = kw['YoY change'];
      const threeMonthChange = kw['Three month change'];

      return {
        keyword: kw.keyword || kw.Keyword,
        searchVolume: kw['Avg. monthly searches'] || 0,
        cpcLow,
        cpcHigh,
        competitionIndexed,
        competition: kw.competition,
        yoyChange,
        threeMonthChange,
      };
    });

    return processed.filter(kw => kw.searchVolume > 0);
  }, [keywordData]);

  const categoryResults = useMemo((): CategoryResult[] => {
    if (processedData.length === 0) return [];

    const parsePercentage = (value: string | undefined): number => {
      if (!value || value === 'N/A') return 0;
      const cleaned = value.replace('%', '').trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    const volumes = processedData.map(k => k.searchVolume);
    const cpcs = processedData.map(k => ((k.cpcLow || 0) + (k.cpcHigh || 0)) / 2).filter(v => v > 0);
    const growths = processedData.map(k => {
      const yoy = parsePercentage(k.yoyChange);
      if (yoy !== 0) return yoy;
      return parsePercentage(k.threeMonthChange);
    });
    const competitions = processedData.map(k => k.competitionIndexed || 0);

    const minVolume = Math.min(...volumes);
    const maxVolume = Math.max(...volumes);
    const minCPC = cpcs.length > 0 ? Math.min(...cpcs) : 0;
    const maxCPC = cpcs.length > 0 ? Math.max(...cpcs) : 1;
    const minGrowth = Math.min(...growths);
    const maxGrowth = Math.max(...growths);
    const minComp = Math.min(...competitions);
    const maxComp = Math.max(...competitions);

    const normalize = (value: number, min: number, max: number): number => {
      if (max === min) return 0;
      return (value - min) / (max - min);
    };

    const scoredKeywords: ScoredKeyword[] = processedData.map(kw => {
      const avgCPC = ((kw.cpcLow || 0) + (kw.cpcHigh || 0)) / 2;
      const growthRate = parsePercentage(kw.yoyChange) || parsePercentage(kw.threeMonthChange) || 0;

      const normVolume = normalize(kw.searchVolume, minVolume, maxVolume);
      const normCPC = normalize(avgCPC, minCPC, maxCPC);
      const normGrowth = normalize(growthRate, minGrowth, maxGrowth);
      const normComp = normalize(kw.competitionIndexed || 0, minComp, maxComp);
      const normInvertedComp = 1 - normComp;

      return {
        ...kw,
        score: 0,
        normalizedVolume: normVolume,
        normalizedCPC: normCPC,
        normalizedGrowth: normGrowth,
        normalizedInvertedCompetition: normInvertedComp,
        avgCPC,
        growthRate,
      };
    });

    const isDefensiveKeyword = (kw: ScoredKeyword): boolean => {
      const hasHighCompetition = (kw.competitionIndexed || 0) >= 67 || kw.competition === 'High';
      const hasHighVolume = kw.searchVolume > 50000;
      return hasHighCompetition && hasHighVolume;
    };

    const calculateHighValue = (kw: ScoredKeyword): number => {
      return 0.45 * kw.normalizedVolume + 0.35 * kw.normalizedCPC + 0.20 * kw.normalizedInvertedCompetition;
    };

    const calculateHighPotential = (kw: ScoredKeyword): number => {
      return 0.50 * kw.normalizedGrowth + 0.30 * kw.normalizedInvertedCompetition + 0.20 * kw.normalizedVolume;
    };

    const calculateQuickWin = (kw: ScoredKeyword): number => {
      return 0.60 * kw.normalizedInvertedCompetition + 0.25 * kw.normalizedVolume + 0.15 * kw.normalizedCPC;
    };

    const calculateDefensive = (kw: ScoredKeyword): number => {
      return 0.50 * kw.normalizedVolume + 0.30 * kw.normalizedCPC + 0.20 * kw.normalizedInvertedCompetition;
    };

    const calculateBudgetFriendly = (kw: ScoredKeyword): number => {
      const lowCPCScore = 1 - kw.normalizedCPC;
      return 0.50 * kw.normalizedVolume + 0.35 * lowCPCScore + 0.15 * kw.normalizedInvertedCompetition;
    };

    const calculateLongTail = (kw: ScoredKeyword): number => {
      const wordCount = kw.keyword.split(' ').length;
      const longTailBonus = wordCount >= 4 ? 1 : 0;
      return 0.40 * longTailBonus + 0.30 * kw.normalizedInvertedCompetition + 0.20 * kw.normalizedVolume + 0.10 * kw.normalizedCPC;
    };

    const isBrandKeyword = (kw: ScoredKeyword): boolean => {
      if (!brandName) return false;
      const kwLower = kw.keyword.toLowerCase();
      const brandLower = brandName.toLowerCase();
      return kwLower.includes(brandLower);
    };

    const calculateBrandKeyword = (kw: ScoredKeyword): number => {
      return 0.50 * kw.normalizedVolume + 0.30 * kw.normalizedCPC + 0.20 * kw.normalizedInvertedCompetition;
    };

    const isSuspiciouslyBranded = (kw: ScoredKeyword): boolean => {
      const hasHighVolume = kw.searchVolume > 100000;
      const hasLowCompetition = (kw.competitionIndexed || 0) < 33;
      const hasLowCPC = kw.avgCPC < 1;
      const hasTitleCase = /[A-Z][a-z]+/.test(kw.keyword);

      return (hasHighVolume && hasLowCompetition && hasLowCPC) || hasTitleCase;
    };

    const isUltraBroad = (kw: ScoredKeyword): boolean => {
      const volumes = processedData.map(k => k.searchVolume).sort((a, b) => b - a);
      const top1PercentThreshold = volumes[Math.floor(volumes.length * 0.01)] || 5000000;

      if (kw.searchVolume > Math.max(5000000, top1PercentThreshold)) {
        return true;
      }

      const wordCount = kw.keyword.split(' ').length;
      const kwLower = kw.keyword.toLowerCase();
      const commercialModifiers = ['buy', 'purchase', 'best', 'top', 'cheap', 'near me', 'price', 'cost', 'deal', 'discount', 'review'];
      const hasCommercialModifier = commercialModifiers.some(mod => kwLower.includes(mod));

      return wordCount < 3 && !hasCommercialModifier;
    };

    const hasLowIntent = (kw: ScoredKeyword): boolean => {
      const kwLower = kw.keyword.toLowerCase();
      const transactionalWords = ['buy', 'purchase', 'price', 'cost', 'cheap', 'deal', 'discount', 'order', 'shop', 'sale', 'subscription', 'sign up'];
      const commercialWords = ['best', 'top', 'review', 'compare', 'vs', 'alternative'];
      const localWords = ['near me', 'near', 'nearby', 'location'];

      const hasTransactional = transactionalWords.some(word => kwLower.includes(word));
      const hasCommercial = commercialWords.some(word => kwLower.includes(word));
      const hasLocal = localWords.some(word => kwLower.includes(word));

      return !hasTransactional && !hasCommercial && !hasLocal;
    };

    const calculateBestValue = (kw: ScoredKeyword): number => {
      const normInvertedCPC = 1 - kw.normalizedCPC;
      let intentBoost = 0;

      const kwLower = kw.keyword.toLowerCase();
      const transactionalWords = ['buy', 'purchase', 'order', 'shop', 'sale', 'subscription', 'sign up'];
      const commercialWords = ['price', 'cost', 'cheap', 'deal', 'discount', 'best', 'top', 'review', 'compare', 'vs', 'alternative'];

      const hasTransactional = transactionalWords.some(word => kwLower.includes(word));
      const hasCommercial = commercialWords.some(word => kwLower.includes(word));

      if (hasTransactional) {
        intentBoost = 0.5;
      } else if (hasCommercial) {
        intentBoost = 0.3;
      }

      return 0.35 * kw.normalizedVolume + 0.35 * normInvertedCPC + 0.20 * kw.normalizedInvertedCompetition + 0.10 * intentBoost;
    };

    const highValueKeywords = scoredKeywords
      .map(kw => ({ ...kw, score: calculateHighValue(kw) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const highPotentialKeywords = scoredKeywords
      .map(kw => ({ ...kw, score: calculateHighPotential(kw) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const quickWinKeywords = scoredKeywords
      .map(kw => ({ ...kw, score: calculateQuickWin(kw) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const defensiveKeywords = scoredKeywords
      .filter(kw => isDefensiveKeyword(kw))
      .map(kw => ({ ...kw, score: calculateDefensive(kw) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const budgetFriendlyKeywords = scoredKeywords
      .filter(kw => kw.avgCPC > 0)
      .map(kw => ({ ...kw, score: calculateBudgetFriendly(kw) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const longTailKeywords = scoredKeywords
      .filter(kw => kw.keyword.split(' ').length >= 4)
      .map(kw => ({ ...kw, score: calculateLongTail(kw) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const brandKeywords = scoredKeywords
      .filter(kw => isBrandKeyword(kw))
      .map(kw => ({ ...kw, score: calculateBrandKeyword(kw) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const bestValueKeywords = scoredKeywords
      .filter(kw => {
        if (kw.avgCPC <= 0) return false;
        if (kw.avgCPC < 0.50) return false;
        if (isUltraBroad(kw)) return false;
        if (hasLowIntent(kw)) return false;
        if (isSuspiciouslyBranded(kw)) return false;

        return true;
      })
      .map(kw => ({ ...kw, score: calculateBestValue(kw) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const bestOverallKeywords = scoredKeywords
      .map(kw => {
        const hvScore = calculateHighValue(kw);
        const qwScore = calculateQuickWin(kw);
        const hpScore = calculateHighPotential(kw);
        const defScore = calculateDefensive(kw);
        const isDefensive = isDefensiveKeyword(kw);

        const overallScore = 0.35 * hvScore + 0.30 * qwScore + 0.25 * hpScore + (isDefensive ? 0.10 * defScore : 0);

        return { ...kw, score: overallScore };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return [
      {
        name: 'Highest ROI Potential',
        icon: <TrendingDown className="w-5 h-5" />,
        description: 'Efficiency-focused keywords: strong commercial/transactional intent + low CPC (min $0.50) + achievable competition. Excludes ultra-broad terms, navigational/branded misspellings, and low-intent searches',
        keywords: bestValueKeywords,
        color: theme === 'dark' ? 'bg-emerald-900/30 border-emerald-700' : 'bg-emerald-50 border-emerald-300',
      },
      {
        name: 'High Value',
        icon: <Award className="w-5 h-5" />,
        description: 'Keywords with high search volume and CPC, ideal for revenue generation',
        keywords: highValueKeywords,
        color: theme === 'dark' ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-300',
      },
      {
        name: 'High Potential',
        icon: <TrendingUp className="w-5 h-5" />,
        description: 'Keywords with strong growth trends and lower competition',
        keywords: highPotentialKeywords,
        color: theme === 'dark' ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-300',
      },
      {
        name: 'Quick Win',
        icon: <Zap className="w-5 h-5" />,
        description: 'Low competition keywords with decent volume, easy to rank',
        keywords: quickWinKeywords,
        color: theme === 'dark' ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-300',
      },
      {
        name: 'Defensive',
        icon: <Shield className="w-5 h-5" />,
        description: 'High competition, high volume keywords likely to be branded terms',
        keywords: defensiveKeywords,
        color: theme === 'dark' ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-300',
      },
      {
        name: 'Budget-Friendly',
        icon: <DollarSign className="w-5 h-5" />,
        description: 'High volume keywords with low CPC, maximize ROI on limited budgets',
        keywords: budgetFriendlyKeywords,
        color: theme === 'dark' ? 'bg-teal-900/30 border-teal-700' : 'bg-teal-50 border-teal-300',
      },
      {
        name: 'Long-Tail',
        icon: <Hash className="w-5 h-5" />,
        description: 'Specific 4+ word phrases with targeted intent and lower competition',
        keywords: longTailKeywords,
        color: theme === 'dark' ? 'bg-orange-900/30 border-orange-700' : 'bg-orange-50 border-orange-300',
      },
      {
        name: 'Brand Protection',
        icon: <Flame className="w-5 h-5" />,
        description: 'Keywords containing your brand name to protect brand presence',
        keywords: brandKeywords,
        color: theme === 'dark' ? 'bg-pink-900/30 border-pink-700' : 'bg-pink-50 border-pink-300',
      },
      {
        name: 'Best Overall',
        icon: <Target className="w-5 h-5" />,
        description: 'Balanced keywords across all metrics for optimal performance',
        keywords: bestOverallKeywords,
        color: theme === 'dark' ? 'bg-slate-900/30 border-slate-700' : 'bg-slate-50 border-slate-300',
      },
    ];
  }, [processedData, theme, brandName]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (num: number): string => {
    return `$${num.toFixed(2)}`;
  };

  const getCompetitionLabel = (indexed: number | undefined): string => {
    if (indexed === undefined) return 'N/A';
    if (indexed < 33) return 'Low';
    if (indexed < 67) return 'Medium';
    return 'High';
  };

  if (processedData.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <button
        onClick={() => setShowRecommendations(!showRecommendations)}
        className={`w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
          theme === 'dark'
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
            : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
        }`}
      >
        {showRecommendations ? (
          <>
            <ChevronUp className="w-5 h-5" />
            Hide Top Keywords for Advertising
          </>
        ) : (
          <>
            <ChevronDown className="w-5 h-5" />
            Show Top Keywords for Advertising
          </>
        )}
      </button>

      {showRecommendations && (
        <div className="mt-6 space-y-4">
          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Advertising Keyword Recommendations
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Based on search volume, CPC, competition, and growth trends, here are the top 5 keywords for each advertising category.
            </p>
          </div>

          {categoryResults.map((category) => (
            <div
              key={category.name}
              className={`border rounded-lg overflow-hidden ${category.color}`}
            >
              <button
                onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
                className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                  theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-white/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    {category.icon}
                  </div>
                  <div className="text-left">
                    <h4 className={`font-bold text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {category.name}
                    </h4>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {category.description}
                    </p>
                  </div>
                </div>
                {expandedCategory === category.name ? (
                  <ChevronUp className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                ) : (
                  <ChevronDown className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                )}
              </button>

              {expandedCategory === category.name && (
                <div className="px-4 pb-4">
                  {category.keywords.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={`border-b ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}>
                            <th className={`py-2 px-2 text-left font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              Keyword
                            </th>
                            <th className={`py-2 px-2 text-right font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              Volume
                            </th>
                            <th className={`py-2 px-2 text-right font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              Avg CPC
                            </th>
                            <th className={`py-2 px-2 text-center font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              Comp
                            </th>
                            <th className={`py-2 px-2 text-right font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              Growth
                            </th>
                            <th className={`py-2 px-2 text-right font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              Score
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {category.keywords.map((kw, idx) => (
                            <tr
                              key={idx}
                              className={`border-b last:border-b-0 ${
                                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                              }`}
                            >
                              <td className={`py-2 px-2 font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {kw.keyword}
                              </td>
                              <td className={`py-2 px-2 text-right ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                {formatNumber(kw.searchVolume)}
                              </td>
                              <td className={`py-2 px-2 text-right ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                {kw.avgCPC > 0 ? formatCurrency(kw.avgCPC) : 'N/A'}
                              </td>
                              <td className={`py-2 px-2 text-center text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                {getCompetitionLabel(kw.competitionIndexed)}
                              </td>
                              <td className={`py-2 px-2 text-right ${
                                kw.growthRate > 0 ? 'text-green-500' : kw.growthRate < 0 ? 'text-red-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                {kw.growthRate !== 0 ? `${kw.growthRate > 0 ? '+' : ''}${kw.growthRate.toFixed(0)}%` : 'N/A'}
                              </td>
                              <td className={`py-2 px-2 text-right font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                                {(kw.score * 100).toFixed(1)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className={`py-4 text-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      No keywords available for this category
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
