import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, GitCompare } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BrandComparisonTable from '../components/BrandComparisonTable';
import BrandSelector from '../components/BrandSelector';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface BrandPageData {
  id: string;
  brand: string;
  meta_title: string;
  meta_description: string;
  created_at: string;
}

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
  cagr3Year: number;
  yearlyAvg2020?: number;
  yearlyAvg2021?: number;
  yearlyAvg2022?: number;
  yearlyAvg2023?: number;
  yearlyAvg2024?: number;
  yearlyAvg2025?: number;
  yearlyAvg2026?: number;
}

export default function CompetitorComparisonPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [brandComparisonStats, setBrandComparisonStats] = useState<BrandStats[]>([]);
  const [membershipTier, setMembershipTier] = useState(1);

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
    if (selectedBrands.length >= 2 && user?.id) {
      fetchBrandComparisonStats();
    } else {
      setBrandComparisonStats([]);
    }
  }, [selectedBrands, user?.id]);

  useEffect(() => {
    const brandsParam = searchParams.get('brands');
    if (brandsParam && availableBrands.length > 0) {
      const requestedBrands = brandsParam.split(',')
        .map(b => b.trim())
        .filter(b => availableBrands.includes(b));

      if (requestedBrands.length >= 2) {
        setSelectedBrands(requestedBrands);
      }
    }
  }, [searchParams, availableBrands]);

  const loadUserData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('membership_tier')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setMembershipTier(profileData.membership_tier || 1);
      }

      const { data: monthlyData, error: monthlyError } = await supabase
        .from('brand_keyword_monthly_data')
        .select('brand, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (monthlyError) throw monthlyError;

      const brandMap = new Map<string, { brand: string; created_at: string }>();

      monthlyData?.forEach((item) => {
        if (!brandMap.has(item.brand) || item.created_at > brandMap.get(item.brand)!.created_at) {
          brandMap.set(item.brand, item);
        }
      });

      const uniqueBrands = Array.from(brandMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const brandNames = uniqueBrands.map(item => item.brand);
      setAvailableBrands(brandNames);

      const brandsParam = searchParams.get('brands');
      if (brandsParam) {
        const requestedBrands = brandsParam.split(',')
          .map(b => b.trim())
          .filter(b => brandNames.includes(b));

        if (requestedBrands.length >= 2) {
          setSelectedBrands(requestedBrands);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setLoading(false);
    }
  };

  const fetchBrandComparisonStats = async () => {
    if (!user?.id || selectedBrands.length < 2) {
      setBrandComparisonStats([]);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('calculate_brand_comparison_stats', {
        brand_names: selectedBrands,
        p_user_id: user.id
      });

      if (error) {
        console.error('Error fetching brand comparison stats:', error);
        setBrandComparisonStats([]);
        return;
      }

      setBrandComparisonStats(data || []);
    } catch (error) {
      console.error('Error in fetchBrandComparisonStats:', error);
      setBrandComparisonStats([]);
    }
  };

  const handleBrandSelectionChange = (brands: string[]) => {
    setSelectedBrands(brands);

    if (brands.length >= 2) {
      setSearchParams({ brands: brands.join(',') });
    } else {
      setSearchParams({});
    }
  };

  return (
    <>
      <Helmet>
        <title>Compare Brands - Competitor Analysis | Top Best Charts</title>
        <meta name="description" content="Compare multiple brands side-by-side with detailed keyword performance metrics, search trends, and competitive insights." />
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
                  Competitor Comparison
                </h1>
              </div>
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Compare multiple brands side-by-side to analyze competitive positioning and keyword performance
              </p>
            </div>

            {!user ? (
              <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-8 text-center`}>
                <GitCompare className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                <h2 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Sign In Required
                </h2>
                <p className={`mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Please sign in to compare your brand data
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
                  Loading your brands...
                </p>
              </div>
            ) : availableBrands.length === 0 ? (
              <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-8 text-center`}>
                <GitCompare className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                <h2 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  No Brand Data Found
                </h2>
                <p className={`mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Upload brand keyword data to start comparing brands
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
                    Select Brands to Compare (minimum 2)
                  </label>
                  <BrandSelector
                    availableBrands={availableBrands}
                    selectedBrands={selectedBrands}
                    onSelectionChange={handleBrandSelectionChange}
                    theme={theme}
                    disabled={false}
                    membershipTier={membershipTier}
                  />
                  {selectedBrands.length === 1 && (
                    <p className={`mt-3 text-sm ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                      Please select at least one more brand to compare
                    </p>
                  )}
                </div>

                {selectedBrands.length >= 2 && brandComparisonStats.length >= 2 ? (
                  <BrandComparisonTable
                    brandStats={brandComparisonStats}
                    availableBrands={availableBrands}
                    theme={theme}
                  />
                ) : selectedBrands.length >= 2 ? (
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
                      Select at least 2 brands above to see the comparison
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
