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

  const [loading, setLoading] = useState(true);
  const [availableKeywords, setAvailableKeywords] = useState<KeywordOption[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<KeywordOption[]>([]);
  const [keywordComparisonStats, setKeywordComparisonStats] = useState<KeywordStats[]>([]);

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
    loadUserData();
  }, [user]);

  useEffect(() => {
    if (selectedKeywords.length >= 2 && user?.id) {
      fetchKeywordComparisonStats();
    } else {
      setKeywordComparisonStats([]);
    }
  }, [selectedKeywords, user?.id]);

  const loadUserData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data: keywordData, error: keywordError } = await supabase
        .from('brand_keyword_data')
        .select('keyword, brand, "Avg. monthly searches"')
        .eq('user_id', user.id)
        .order('Avg. monthly searches', { ascending: false });

      if (keywordError) throw keywordError;

      const keywordOptions: KeywordOption[] = (keywordData || []).map((item) => ({
        keyword: item.keyword,
        brand: item.brand,
        avgMonthlySearches: item['Avg. monthly searches'] || 0
      }));

      setAvailableKeywords(keywordOptions);

      const keywordsParam = searchParams.get('keywords');
      const brandsParam = searchParams.get('brands');

      if (keywordsParam && brandsParam) {
        const requestedKeywords = keywordsParam.split(',').map((k) => k.trim());
        const requestedBrands = brandsParam.split(',').map((b) => b.trim());

        const matchedKeywords = keywordOptions.filter((kw, idx) => {
          return (
            requestedKeywords[idx] === kw.keyword &&
            requestedBrands[idx] === kw.brand
          );
        });

        if (matchedKeywords.length >= 2) {
          setSelectedKeywords(matchedKeywords);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
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
    if (!user?.id || selectedKeywords.length < 2) {
      setKeywordComparisonStats([]);
      return;
    }

    try {
      const keywordBrandPairs = selectedKeywords.map((kw) => ({
        keyword: kw.keyword,
        brand: kw.brand
      }));

      const { data, error } = await supabase
        .from('brand_keyword_data')
        .select('keyword, brand, "Avg. monthly searches", "Three month change", "YoY change", Competition, "Competition (indexed value)", "Top of page bid (low range)", "Top of page bid (high range)", sentiment, demand_score, interest_score, intent, ai_category')
        .eq('user_id', user.id)
        .in(
          'keyword',
          keywordBrandPairs.map((p) => p.keyword)
        );

      if (error) {
        console.error('Error fetching keyword comparison stats:', error);
        setKeywordComparisonStats([]);
        return;
      }

      const filteredData = (data || []).filter((item) =>
        keywordBrandPairs.some(
          (pair) => pair.keyword === item.keyword && pair.brand === item.brand
        )
      );

      const stats: KeywordStats[] = filteredData.map((item) => ({
        keyword: item.keyword,
        brand: item.brand,
        avgMonthlySearches: item['Avg. monthly searches'] || 0,
        threeMonthChange: parsePercentage(item['Three month change']),
        yoyChange: parsePercentage(item['YoY change']),
        competition: item.Competition || '',
        competitionIndexed: item['Competition (indexed value)'] || 0,
        topBidLow: item['Top of page bid (low range)'] || 0,
        topBidHigh: item['Top of page bid (high range)'] || 0,
        sentiment: item.sentiment || 0,
        demandScore: item.demand_score || 0,
        interestScore: item.interest_score || 0,
        intent: item.intent || '',
        aiCategory: item.ai_category || ''
      }));

      setKeywordComparisonStats(stats);
    } catch (error) {
      console.error('Error in fetchKeywordComparisonStats:', error);
      setKeywordComparisonStats([]);
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

            {!user ? (
              <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-8 text-center`}>
                <GitCompare className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                <h2 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Sign In Required
                </h2>
                <p className={`mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Please sign in to compare your keyword data
                </p>
                <button
                  onClick={() => navigate('/profile')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Sign In
                </button>
              </div>
            ) : loading ? (
              <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-12 text-center`}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  Loading your keywords...
                </p>
              </div>
            ) : availableKeywords.length === 0 ? (
              <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-8 text-center`}>
                <GitCompare className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                <h2 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  No Keyword Data Found
                </h2>
                <p className={`mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Upload brand keyword data to start comparing keywords
                </p>
                <button
                  onClick={() => navigate('/upload')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Upload Data
                </button>
              </div>
            ) : (
              <>
                <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-6 mb-6`}>
                  <label className={`block text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Select Keywords to Compare (minimum 2)
                  </label>
                  <KeywordSelector
                    availableKeywords={availableKeywords}
                    selectedKeywords={selectedKeywords}
                    onSelectionChange={handleKeywordSelectionChange}
                    theme={theme}
                    disabled={false}
                    maxSelection={6}
                  />
                  {selectedKeywords.length === 1 && (
                    <p className={`mt-3 text-sm ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                      Please select at least one more keyword to compare
                    </p>
                  )}
                </div>

                {selectedKeywords.length >= 2 && keywordComparisonStats.length >= 2 ? (
                  <KeywordComparisonTable
                    keywordStats={keywordComparisonStats}
                    theme={theme}
                  />
                ) : selectedKeywords.length >= 2 ? (
                  <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-12 text-center`}>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                      Loading comparison data...
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
            )}
          </div>
        </main>

        <Footer theme={theme} />
      </div>
    </>
  );
}
