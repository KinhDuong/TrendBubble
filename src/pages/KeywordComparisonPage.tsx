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

  const parsePercentage = (value: string | null): number => {
    if (!value) return 0;
    const cleaned = value.replace('%', '').replace(/[<>]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed / 100;
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

        // First try to get aggregate data from brand_pages table
        const { data: pageData, error: pageError } = await supabase
          .from('brand_pages')
          .select('brand, avg_monthly_searches, representative_keyword, competition, cpc_low, cpc_high, yoy_change, three_month_change, demand_score, interest_score, sentiment')
          .eq('brand', kw.brand)
          .maybeSingle();

        if (pageError) {
          console.error(`Error fetching page data for ${kw.brand}:`, pageError);
          continue;
        }

        if (pageData) {
          console.log(`Found brand page data for ${kw.brand}`);
          allStats.push({
            keyword: kw.keyword, // Keep the original selected keyword
            brand: pageData.brand,
            avgMonthlySearches: pageData.avg_monthly_searches || 0,
            threeMonthChange: pageData.three_month_change || 0,
            yoyChange: pageData.yoy_change || 0,
            competition: pageData.competition || '',
            competitionIndexed: 0,
            topBidLow: pageData.cpc_low || 0,
            topBidHigh: pageData.cpc_high || 0,
            sentiment: pageData.sentiment || 0,
            demandScore: pageData.demand_score || 0,
            interestScore: pageData.interest_score || 0,
            intent: '',
            aiCategory: ''
          });
        } else {
          // Fallback to fetching from brand_keyword_data
          console.warn(`No brand page found for ${kw.brand}, falling back to keyword data`);
          const { data, error } = await supabase
            .from('brand_keyword_data')
            .select('keyword, brand, "Avg. monthly searches", "Three month change", "YoY change", competition, "Competition (indexed value)", "Top of page bid (low range)", "Top of page bid (high range)", sentiment, demand_score, interest_score, intent_type, ai_category')
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
            console.log(`Found keyword data for ${kw.keyword} (${kw.brand})`);
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
              aiCategory: row.ai_category || ''
            });
          } else {
            console.warn(`No data found for ${kw.keyword} (${kw.brand})`);
          }
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
