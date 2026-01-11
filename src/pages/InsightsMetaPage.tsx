import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BrandKeywordUpload from '../components/BrandKeywordUpload';
import { TrendingUp, Calendar, Database, BarChart3, AlertCircle, CheckCircle, ArrowRight, Lock, Unlock, Loader2, Upload, X } from 'lucide-react';

interface BrandMetadata {
  brand: string;
  user_id: string | null;
  username: string | null;
  keyword_count: number;
  total_volume: number;
  available_months: number;
  latest_month: string;
  oldest_month: string;
  has_yoy_data: boolean;
  has_page: boolean;
  is_public: boolean;
  page_id?: string;
}

export default function InsightsMetaPage() {
  const navigate = useNavigate();
  const { isAdmin, user, logout } = useAuth();
  const [brandMetadata, setBrandMetadata] = useState<BrandMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingBrand, setTogglingBrand] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

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
    setShowUploadModal(false);
    try {
      if (!user?.id) {
        setBrandMetadata([]);
        setLoading(false);
        return;
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const username = userProfile?.username || null;

      const { data: brandPages, error: pagesError } = await supabase
        .from('brand_pages')
        .select('id, brand, user_id, is_public, page_id')
        .eq('user_id', user.id);

      if (pagesError) throw pagesError;

      if (!brandPages || brandPages.length === 0) {
        setBrandMetadata([]);
        setLoading(false);
        return;
      }

      const { data: aggregatedData, error: aggregateError } = await supabase
        .rpc('get_brand_metadata_by_user', { p_user_id: user.id });

      if (aggregateError) throw aggregateError;

      const statsMap = new Map(
        aggregatedData?.map((row: any) => [row.brand, row]) || []
      );

      const result: BrandMetadata[] = brandPages.map(page => {
        const stats = statsMap.get(page.brand);

        return {
          brand: page.brand,
          user_id: page.user_id,
          username: username,
          keyword_count: stats ? Number(stats.keyword_count) : 0,
          total_volume: stats ? Number(stats.total_volume) : 0,
          available_months: stats ? Number(stats.available_months) : 0,
          latest_month: stats?.latest_month || '',
          oldest_month: stats?.oldest_month || '',
          has_yoy_data: stats?.has_yoy_data || false,
          has_page: true,
          is_public: page.is_public,
          page_id: page.page_id
        };
      }).sort((a, b) => b.keyword_count - a.keyword_count);

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

  const handleTogglePublic = async (brand: BrandMetadata) => {
    if (!brand.page_id || togglingBrand) return;

    setTogglingBrand(brand.brand);
    try {
      const { error } = await supabase
        .from('brand_pages')
        .update({ is_public: !brand.is_public })
        .eq('user_id', brand.user_id)
        .eq('page_id', brand.page_id);

      if (error) throw error;

      setBrandMetadata(prev => prev.map(b =>
        b.brand === brand.brand && b.user_id === brand.user_id
          ? { ...b, is_public: !b.is_public }
          : b
      ));
    } catch (error) {
      console.error('Error toggling page visibility:', error);
      alert('Failed to update page visibility. Please try again.');
    } finally {
      setTogglingBrand(null);
    }
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
            <div className="flex items-center justify-between mb-4">
              <h1 className={`text-3xl md:text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Brand Insights Metadata
              </h1>
              <button
                onClick={() => setShowUploadModal(true)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload Data
              </button>
            </div>
            <p className={`text-lg mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
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
                      Status
                    </th>
                    <th className={`text-center py-3 px-4 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Visibility
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
                        {brand.has_page ? (
                          <button
                            onClick={() => {
                              const identifier = brand.username || brand.user_id;
                              if (identifier && brand.page_id) {
                                navigate(`/insights/${encodeURIComponent(identifier)}/${brand.page_id}/`);
                              }
                            }}
                            className={`text-left hover:underline ${
                              theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                            }`}
                          >
                            {brand.brand}
                          </button>
                        ) : (
                          <span>{brand.brand}</span>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {brand.keyword_count.toLocaleString()}
                      </td>
                      <td className={`py-3 px-4 text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {brand.total_volume.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {brand.has_yoy_data ? (
                            <button
                              onClick={() => navigate(`/admin/brand-data/${encodeURIComponent(brand.brand)}`)}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${theme === 'dark' ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                              title="View full brand data"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Full Data
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/admin/brand-data/${encodeURIComponent(brand.brand)}`)}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${theme === 'dark' ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                              title="View brand data"
                            >
                              <AlertCircle className="w-3 h-3" />
                              Limited
                            </button>
                          )}
                          {brand.has_page && (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                              Page
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {brand.has_page ? (
                          <button
                            onClick={() => handleTogglePublic(brand)}
                            disabled={togglingBrand === brand.brand}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              togglingBrand === brand.brand
                                ? 'opacity-50 cursor-wait'
                                : brand.is_public
                                ? theme === 'dark'
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                                : theme === 'dark'
                                ? 'bg-gray-600 hover:bg-gray-700 text-white'
                                : 'bg-gray-600 hover:bg-gray-700 text-white'
                            }`}
                            title={brand.is_public ? 'Page is public - click to make private' : 'Page is private - click to make public'}
                          >
                            {togglingBrand === brand.brand ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : brand.is_public ? (
                              <>
                                <Unlock className="w-4 h-4" />
                                Public
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4" />
                                Private
                              </>
                            )}
                          </button>
                        ) : (
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                            No page
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            const identifier = brand.username || brand.user_id;
                            if (identifier && brand.has_page && brand.page_id) {
                              navigate(`/insights/${encodeURIComponent(identifier)}/${brand.page_id}/`);
                            }
                          }}
                          disabled={!brand.has_page}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                            !brand.has_page
                              ? theme === 'dark'
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : theme === 'dark'
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                          title={brand.has_page ? 'View brand insight page' : 'No page created yet'}
                        >
                          View Page
                          <ArrowRight className="w-3 h-3" />
                        </button>
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
              <p>
                <strong>Tip:</strong> Click on any brand name to view its detailed insight page.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-lg shadow-xl ${
            theme === 'dark' ? 'bg-gray-900' : 'bg-white'
          }`}>
            <div className={`sticky top-0 flex items-center justify-between p-6 border-b ${
              theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Upload Brand Keyword Data
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <BrandKeywordUpload onUploadComplete={loadBrandMetadata} theme={theme} />
            </div>
          </div>
        </div>
      )}

      <Footer theme={theme} />
    </>
  );
}
