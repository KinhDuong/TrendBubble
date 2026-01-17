import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, GitCompare } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import Footer from '../components/Footer';
import KeywordComparisonTable from '../components/KeywordComparisonTable';
import KeywordSelector from '../components/KeywordSelector';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface KeywordOption {
  keyword: string;
  brand: string;
  avgMonthlySearches: number;
}

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
  cagr3Year: number;
  yearlyAvg2020?: number;
  yearlyAvg2021?: number;
  yearlyAvg2022?: number;
  yearlyAvg2023?: number;
  yearlyAvg2024?: number;
  yearlyAvg2025?: number;
  yearlyAvg2026?: number;
  yearlyAvg2027?: number;
  yearlyAvg2028?: number;
  yearlyAvg2029?: number;
  yearlyAvg2030?: number;
}

export default function KeywordComparisonPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState<KeywordOption[]>([]);
  const [keywordComparisonStats, setKeywordComparisonStats] = useState<KeywordStats[]>([]);
  const [fetchingComparison, setFetchingComparison] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    loadInitialKeywords();
  }, []);

  useEffect(() => {
    if (selectedKeywords.length >= 2) {
      fetchKeywordComparisonStats();
    } else {
      setKeywordComparisonStats([]);
    }
  }, [selectedKeywords]);

  const loadInitialKeywords = async () => {
    const keywordsParam = searchParams.get('keywords');
    const brandsParam = searchParams.get('brands');

    if (!keywordsParam || !brandsParam) {
      return;
    }

    try {
      setLoading(true);

      const requestedKeywords = keywordsParam.split(',').map((k) => k.trim());
      const requestedBrands = brandsParam.split(',').map((b) => b.trim());

      const matchedKeywords: KeywordOption[] = [];

      for (let i = 0; i < requestedKeywords.length; i++) {
        const keyword = requestedKeywords[i];
        const brand = requestedBrands[i];

        const { data, error } = await supabase
          .from('brand_keyword_data')
          .select('keyword, brand, "Avg. monthly searches"')
          .eq('keyword', keyword)
          .eq('brand', brand)
          .not('"Avg. monthly searches"', 'is', null)
          .order('"Avg. monthly searches"', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          matchedKeywords.push({
            keyword: data.keyword,
            brand: data.brand,
            avgMonthlySearches: data['Avg. monthly searches'] || 0
          });
        }
      }

      if (matchedKeywords.length >= 2) {
        setSelectedKeywords(matchedKeywords);
      }
    } catch (error) {
      console.error('Error loading initial keywords:', error);
    } finally {
      setLoading(false);
    }
  };

  const parsePercentage = (value: string | number | null): number => {
    if (!value) return 0;

    // If it's already a number, return as-is (already in decimal form)
    if (typeof value === 'number') return value;

    // If it's a string, parse it
    const cleaned = value.replace('%', '').replace(/[<>]/g, '').trim();
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return 0;

    // If the original string had a '%' sign, divide by 100
    // Otherwise, assume it's already in decimal form
    if (value.includes('%')) {
      return parsed / 100;
    }

    return parsed;
  };

  const fetchKeywordComparisonStats = async () => {
    if (selectedKeywords.length < 2) {
      setKeywordComparisonStats([]);
      setComparisonError(null);
      return;
    }

    console.log('Fetching comparison data for:', selectedKeywords);
    setFetchingComparison(true);
    setComparisonError(null);

    try {
      const allStats: KeywordStats[] = [];

      for (const kw of selectedKeywords) {
        console.log(`Querying for keyword: "${kw.keyword}", brand: "${kw.brand}"`);

        const { data, error } = await supabase
          .from('brand_keyword_data')
          .select('keyword, brand, "Avg. monthly searches", "Three month change", "YoY change", competition, "Competition (indexed value)", "Top of page bid (low range)", "Top of page bid (high range)", sentiment, demand_score, interest_score, intent_type, ai_category, "2020 Avg", "2021 Avg", "2022 Avg", "2023 Avg", "2024 Avg", "2025 Avg", "2026 Avg", "2027 Avg", "2028 Avg", "2029 Avg", "2030 Avg"')
          .eq('keyword', kw.keyword)
          .eq('brand', kw.brand)
          .not('"Avg. monthly searches"', 'is', null)
          .order('"Avg. monthly searches"', { ascending: false })
          .limit(1);

        if (error) {
          console.error(`Error fetching data for ${kw.keyword} (${kw.brand}):`, error);
          continue;
        }

        if (data && data.length > 0) {
          const row = data[0];
          console.log(`Found data for ${kw.keyword} (${kw.brand})`);

          // Calculate CAGR dynamically from yearly averages
          const calculateCAGR = (): number => {
            const yearlyData = [
              { year: 2030, value: row['2030 Avg'] },
              { year: 2029, value: row['2029 Avg'] },
              { year: 2028, value: row['2028 Avg'] },
              { year: 2027, value: row['2027 Avg'] },
              { year: 2026, value: row['2026 Avg'] },
              { year: 2025, value: row['2025 Avg'] },
              { year: 2024, value: row['2024 Avg'] },
              { year: 2023, value: row['2023 Avg'] },
              { year: 2022, value: row['2022 Avg'] },
              { year: 2021, value: row['2021 Avg'] },
              { year: 2020, value: row['2020 Avg'] },
            ];

            // Find the most recent 3-year period with valid data
            for (let i = 0; i < yearlyData.length - 2; i++) {
              const endYear = yearlyData[i];
              const startYear = yearlyData[i + 2];

              if (endYear.value && startYear.value && endYear.value > 0 && startYear.value > 0) {
                // Calculate 3-year CAGR: ((ending/beginning)^(1/2)) - 1
                return Math.pow(endYear.value / startYear.value, 1.0 / 2.0) - 1;
              }
            }

            return 0;
          };

          allStats.push({
            keyword: row.keyword,
            brand: row.brand,
            avgMonthlySearches: row['Avg. monthly searches'] || 0,
            threeMonthChange: parsePercentage(row['Three month change']),
            yoyChange: parsePercentage(row['YoY change']),
            competition: row.competition || '',
            competitionIndexed: row['Competition (indexed value)'] || 0,
            topBidLow: row['Top of page bid (low range)'] || 0,
            topBidHigh: row['Top of page bid (high range)'] || 0,
            sentiment: row.sentiment || 0,
            demandScore: row.demand_score || 0,
            interestScore: row.interest_score || 0,
            intent: row.intent_type || '',
            aiCategory: row.ai_category || '',
            cagr3Year: calculateCAGR(),
            yearlyAvg2020: row['2020 Avg'] || undefined,
            yearlyAvg2021: row['2021 Avg'] || undefined,
            yearlyAvg2022: row['2022 Avg'] || undefined,
            yearlyAvg2023: row['2023 Avg'] || undefined,
            yearlyAvg2024: row['2024 Avg'] || undefined,
            yearlyAvg2025: row['2025 Avg'] || undefined,
            yearlyAvg2026: row['2026 Avg'] || undefined,
            yearlyAvg2027: row['2027 Avg'] || undefined,
            yearlyAvg2028: row['2028 Avg'] || undefined,
            yearlyAvg2029: row['2029 Avg'] || undefined,
            yearlyAvg2030: row['2030 Avg'] || undefined
          });
        } else {
          console.warn(`No data found for ${kw.keyword} (${kw.brand})`);
        }
      }

      console.log(`Comparison complete. Found ${allStats.length} results`);

      if (allStats.length < 2) {
        setComparisonError('Could not find complete data for the selected keywords');
      }

      setKeywordComparisonStats(allStats);
    } catch (error) {
      console.error('Error in fetchKeywordComparisonStats:', error);
      setComparisonError('Failed to load comparison data');
      setKeywordComparisonStats([]);
    } finally {
      setFetchingComparison(false);
    }
  };

  const handleKeywordSelectionChange = (keywords: KeywordOption[]) => {
    setSelectedKeywords(keywords);

    if (keywords.length >= 2) {
      const keywordNames = keywords.map((k) => k.keyword).join(',');
      const brandNames = keywords.map((k) => k.brand).join(',');
      setSearchParams({ keywords: keywordNames, brands: brandNames });
    } else {
      setSearchParams({});
    }
  };

  return (
    <>
      <Helmet>
        <title>Compare Keywords - Keyword Analysis | Top Best Charts</title>
        <meta name="description" content="Compare multiple keywords side-by-side with detailed performance metrics, search trends, and competitive insights." />
      </Helmet>

      <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Header theme={theme} setTheme={setTheme} />

        <main className="flex-grow">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <button
              onClick={() => navigate('/insights')}
              className={`inline-flex items-center gap-2 text-sm mb-6 transition-colors ${
                theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Insights
            </button>

            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <GitCompare className={`w-8 h-8 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                <h1 className={`text-3xl md:text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Keyword Comparison
                </h1>
              </div>
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Compare multiple keywords side-by-side to analyze performance metrics and search trends
              </p>
            </div>

            <>
              <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-6 mb-6`}>
                <label className={`block text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Search and Select Keywords to Compare (minimum 2)
                </label>
                <KeywordSelector
                  selectedKeywords={selectedKeywords}
                  onSelectionChange={handleKeywordSelectionChange}
                  theme={theme}
                  disabled={false}
                  maxSelection={6}
                  userId={user?.id}
                />
                {selectedKeywords.length === 1 && (
                  <p className={`mt-3 text-sm ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                    Please select at least one more keyword to compare
                  </p>
                )}
              </div>

              {comparisonError ? (
                <div className={`${theme === 'dark' ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} rounded-lg border p-8 text-center`}>
                  <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                    {comparisonError}
                  </p>
                </div>
              ) : selectedKeywords.length >= 2 && keywordComparisonStats.length >= 2 ? (
                <KeywordComparisonTable
                  keywordStats={keywordComparisonStats}
                  theme={theme}
                />
              ) : fetchingComparison ? (
                <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-12 text-center`}>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    Loading comparison data...
                  </p>
                </div>
              ) : selectedKeywords.length >= 2 ? (
                <div className={`${theme === 'dark' ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'} rounded-lg border p-8 text-center`}>
                  <p className={`${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                    No data available for the selected keywords
                  </p>
                </div>
              ) : (
                <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-12 text-center`}>
                  <GitCompare className={`w-20 h-20 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                  <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Select at least 2 keywords above to see the comparison
                  </p>
                </div>
              )}
            </>
          </div>
        </main>

        <Footer theme={theme} />
      </div>
    </>
  );
}
