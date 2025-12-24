import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { TrendingUp, Calendar, Database, BarChart3, AlertCircle, CheckCircle, ArrowRight, Table } from 'lucide-react';

interface BrandMetadata {
  brand: string;
  user_id: string | null;
  keyword_count: number;
  total_volume: number;
  available_months: number;
  latest_month: string;
  oldest_month: string;
  has_yoy_data: boolean;
  has_page: boolean;
}

export default function InsightsMetaPage() {
  const navigate = useNavigate();
  const { isAdmin, user, logout } = useAuth();
  const [brandMetadata, setBrandMetadata] = useState<BrandMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';
  });

  useEffect(() => {
    document.documentElement.style.backgroundColor = theme === 'dark' ? '#111827' : '#f1f3f4';
  }, [theme]);

  useEffect(() => {
    loadBrandMetadata();
  }, [user?.id]);

  const loadBrandMetadata = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        setBrandMetadata([]);
        setLoading(false);
        return;
      }

      const { data: monthlyData, error: monthlyError } = await supabase
        .from('brand_keyword_monthly_data')
        .select('brand, month, keyword_count, total_volume, user_id')
        .eq('user_id', user.id);

      if (monthlyError) throw monthlyError;

      const { data: keywordData, error: keywordError } = await supabase
        .from('brand_keyword_data')
        .select('brand, keyword, user_id')
        .eq('user_id', user.id)
        .limit(5000);

      if (keywordError) throw keywordError;

      const { data: brandPages, error: pagesError } = await supabase
        .from('brand_pages')
        .select('brand, user_id')
        .eq('user_id', user.id);

      if (pagesError) throw pagesError;

      const brandMap = new Map<string, BrandMetadata>();

      monthlyData?.forEach((row) => {
        const key = `${row.user_id}:${row.brand}`;
        if (!brandMap.has(key)) {
          brandMap.set(key, {
            brand: row.brand,
            user_id: row.user_id,
            keyword_count: 0,
            total_volume: 0,
            available_months: 0,
            latest_month: row.month,
            oldest_month: row.month,
            has_yoy_data: false,
            has_page: false
          });
        }

        const metadata = brandMap.get(key)!;
        metadata.available_months++;
        metadata.total_volume += row.total_volume;

        if (new Date(row.month) > new Date(metadata.latest_month)) {
          metadata.latest_month = row.month;
        }
        if (new Date(row.month) < new Date(metadata.oldest_month)) {
          metadata.oldest_month = row.month;
        }
      });

      keywordData?.forEach((row) => {
        const key = `${row.user_id}:${row.brand}`;
        if (brandMap.has(key)) {
          brandMap.get(key)!.keyword_count++;
        }
      });

      brandPages?.forEach((page) => {
        const key = `${page.user_id}:${page.brand}`;
        if (brandMap.has(key)) {
          const metadata = brandMap.get(key)!;
          metadata.has_page = true;
        }
      });

      brandMap.forEach((metadata) => {
        metadata.has_yoy_data = metadata.available_months >= 24;
        metadata.total_volume = Math.round(metadata.total_volume / metadata.available_months);
      });

      const result = Array.from(brandMap.values()).sort((a, b) =>
        b.keyword_count - a.keyword_count
      );

      setBrandMetadata(result);
    } catch (error) {
      console.error('Error loading brand metadata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.style.backgroundColor = newTheme === 'dark' ? '#111827' : '#f1f3f4';
  };

  const filteredBrands = brandMetadata.filter(brand =>
    brand.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBrands = brandMetadata.length;
  const totalKeywords = brandMetadata.reduce((sum, b) => sum + b.keyword_count, 0);
  const brandsWithYoY = brandMetadata.filter(b => b.has_yoy_data).length;
  const brandsWithPages = brandMetadata.filter(b => b.has_page).length;

  const baseUrl = import.meta.env.VITE_BASE_URL || 'https://topbestcharts.com';
  const pageUrl = `${baseUrl}/insights-meta/`;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Brand Insights Metadata - Data Quality & Statistics | Top Best Charts</title>
        <meta name="description" content={`Browse metadata for ${totalBrands} brands with ${totalKeywords} keywords tracked. View data quality indicators, date ranges, and statistics.`} />
        <meta name="keywords" content="brand insights, keyword metadata, data quality, SEO statistics, brand analysis" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={pageUrl} />

        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content="Brand Insights Metadata - Top Best Charts" />
        <meta property="og:description" content={`Browse metadata for ${totalBrands} brands with ${totalKeywords} keywords tracked.`} />
        <meta property="og:site_name" content="Top Best Charts" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Brand Insights Metadata - Top Best Charts" />
        <meta name="twitter:description" content={`Browse metadata for ${totalBrands} brands with ${totalKeywords} keywords tracked.`} />
      </Helmet>

      <Header
        theme={theme}
        isAdmin={isAdmin}
        isLoggedIn={!!user}
        onLoginClick={() => {}}
        onLogout={logout}
        title="Top Best Charts"
      />

      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-8`}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className={`text-3xl md:text-4xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Brand Insights Metadata
            </h1>
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Browse data quality indicators and statistics for all tracked brands
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6`}>
              <div className="flex items-center gap-3 mb-2">
                <Database className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Brands
                </h3>
              </div>
              <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {totalBrands}
              </p>
            </div>

            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6`}>
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Keywords
                </h3>
              </div>
              <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {totalKeywords.toLocaleString()}
              </p>
            </div>

            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6`}>
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className={`w-5 h-5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
                <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  With YoY Data
                </h3>
              </div>
              <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {brandsWithYoY}
              </p>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                24+ months of data
              </p>
            </div>

            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6`}>
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className={`w-5 h-5 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
                <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  With Pages
                </h3>
              </div>
              <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {brandsWithPages}
              </p>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Published pages
              </p>
            </div>
          </div>

          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 mb-8`}>
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search brands..."
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className={`text-left py-3 px-4 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Brand
                    </th>
                    <th className={`text-center py-3 px-4 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Keywords
                    </th>
                    <th className={`text-center py-3 px-4 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Avg. Volume
                    </th>
                    <th className={`text-center py-3 px-4 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Months
                    </th>
                    <th className={`text-center py-3 px-4 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Date Range
                    </th>
                    <th className={`text-center py-3 px-4 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Status
                    </th>
                    <th className={`text-center py-3 px-4 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBrands.map((brand, index) => (
                    <tr
                      key={brand.brand}
                      className={`border-b ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}
                    >
                      <td className={`py-3 px-4 font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {brand.brand}
                      </td>
                      <td className={`py-3 px-4 text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {brand.keyword_count.toLocaleString()}
                      </td>
                      <td className={`py-3 px-4 text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {brand.total_volume.toLocaleString()}
                      </td>
                      <td className={`py-3 px-4 text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          brand.has_yoy_data
                            ? theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                            : theme === 'dark' ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'
                        }`}>
                          <Calendar className="w-3 h-3" />
                          {brand.available_months}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-center text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {new Date(brand.oldest_month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })} - {new Date(brand.latest_month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {brand.has_yoy_data ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                              <CheckCircle className="w-3 h-3" />
                              Full Data
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${theme === 'dark' ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                              <AlertCircle className="w-3 h-3" />
                              Limited
                            </span>
                          )}
                          {brand.has_page && (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                              Page
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => brand.user_id && navigate(`/insights/${encodeURIComponent(brand.user_id)}/${encodeURIComponent(brand.brand)}`)}
                            disabled={!brand.user_id}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                              !brand.user_id
                                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                : theme === 'dark'
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            View
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => navigate(`/admin/brand-data/${encodeURIComponent(brand.brand)}`)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                            title="View brand data"
                          >
                            <Table className="w-3 h-3" />
                            Data
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredBrands.length === 0 && (
              <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                No brands found matching "{searchQuery}"
              </div>
            )}
          </div>

          <div className={`${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-blue-50 border-blue-200'} border rounded-lg p-6`}>
            <h2 className={`text-lg font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              About This Data
            </h2>
            <div className={`space-y-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              <p>
                <strong>Full Data:</strong> Brands with 24+ months of data support year-over-year comparisons and all performance filters.
              </p>
              <p>
                <strong>Limited Data:</strong> Brands with less than 24 months use 3-month trend analysis for performance filters.
              </p>
              <p>
                <strong>Average Volume:</strong> Mean monthly search volume across all available months.
              </p>
              <p>
                <strong>Keywords:</strong> Total unique keywords tracked for each brand.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer theme={theme} />
    </>
  );
}
