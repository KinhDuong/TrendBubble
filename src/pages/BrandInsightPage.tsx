import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/Header';
import Footer from '../components/Footer';
import KeywordChart from '../components/KeywordChart';
import { TrendingUp, Download, ArrowLeft } from 'lucide-react';

interface MonthlyData {
  id: string;
  brand: string;
  month: string;
  total_volume: number;
  keyword_count: number;
  top_keywords: Array<{ keyword: string; volume: number }>;
}

export default function BrandInsightPage() {
  const { brandName } = useParams<{ brandName: string }>();
  const navigate = useNavigate();
  const { isAdmin, logout } = useAuth();
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';
  });

  useEffect(() => {
    document.documentElement.style.backgroundColor = theme === 'dark' ? '#111827' : '#f1f3f4';
  }, [theme]);

  useEffect(() => {
    if (brandName) {
      loadBrandData();
    }
  }, [brandName]);

  const loadBrandData = async () => {
    if (!brandName) return;

    setLoading(true);
    try {
      const decodedBrand = decodeURIComponent(brandName);

      const { data, error } = await supabase
        .from('brand_keyword_monthly_data')
        .select('*')
        .eq('brand', decodedBrand)
        .order('month', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setMonthlyData(data);
      } else {
        setMonthlyData([]);
      }
    } catch (error) {
      console.error('Error loading brand data:', error);
      setMonthlyData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!brandName) return;

    try {
      const decodedBrand = decodeURIComponent(brandName);

      const { data, error } = await supabase
        .from('brand_keyword_data')
        .select('*')
        .eq('brand', decodedBrand)
        .order('month', { ascending: true });

      if (error) throw error;

      const csv = [
        ['Brand', 'Keyword', 'Search Volume', 'Month'].join(','),
        ...data.map(row =>
          [row.brand, row.keyword, row.search_volume, row.month].join(',')
        )
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${decodedBrand}-keywords.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (loading) {
    return (
      <>
        <Header
          theme={theme}
          isAdmin={isAdmin}
          onLoginClick={() => {}}
          onLogout={logout}
          title="Top Best Charts"
        />
        <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
          <div className="text-xl">Loading...</div>
        </div>
        <Footer theme={theme} />
      </>
    );
  }

  if (!monthlyData.length) {
    return (
      <>
        <Helmet>
          <title>Brand Not Found | Top Best Charts</title>
          <meta name="description" content="Brand keyword data not found" />
        </Helmet>
        <Header
          theme={theme}
          isAdmin={isAdmin}
          onLoginClick={() => {}}
          onLogout={logout}
          title="Top Best Charts"
        />
        <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} px-4`}>
          <div className="text-center max-w-md">
            <TrendingUp className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <h1 className="text-4xl font-bold mb-4">Brand not found</h1>
            <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              No keyword data found for "{brandName}". The brand may not have any data uploaded yet.
            </p>
            <button
              onClick={() => navigate('/insight')}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow text-white'}`}
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Insights
            </button>
          </div>
        </div>
        <Footer theme={theme} />
      </>
    );
  }

  const decodedBrand = decodeURIComponent(brandName || '');
  const avgKeywordCount = Math.round(
    monthlyData.reduce((sum, d) => sum + d.keyword_count, 0) / monthlyData.length
  );
  const avgVolume = Math.round(
    monthlyData.reduce((sum, d) => sum + d.total_volume, 0) / monthlyData.length
  );
  const totalMonths = monthlyData.length;

  const baseUrl = import.meta.env.VITE_BASE_URL || 'https://topbestcharts.com';
  const pageUrl = `${baseUrl}/insight/${encodeURIComponent(decodedBrand)}/`;
  const pageTitle = `${decodedBrand} - Keyword Search Trends & SEO Insights`;
  const pageDescription = `Analyze ${decodedBrand} keyword search volume trends and SEO performance data. Track ${avgKeywordCount} keywords across ${totalMonths} months with an average monthly search volume of ${avgVolume.toLocaleString()}.`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <link rel="canonical" href={pageUrl} />

        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:site_name" content="Top Best Charts" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={pageUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": pageTitle,
            "description": pageDescription,
            "url": pageUrl,
            "breadcrumb": {
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": baseUrl
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "Insights",
                  "item": `${baseUrl}/insight/`
                },
                {
                  "@type": "ListItem",
                  "position": 3,
                  "name": decodedBrand,
                  "item": pageUrl
                }
              ]
            }
          })}
        </script>
      </Helmet>

      <Header
        theme={theme}
        isAdmin={isAdmin}
        onLoginClick={() => {}}
        onLogout={logout}
        title="Top Best Charts"
      />

      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6">
            <button
              onClick={() => navigate('/insight')}
              className={`inline-flex items-center gap-2 text-sm mb-4 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Insights
            </button>
            <h1 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {decodedBrand} - Keyword Insights
            </h1>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Search volume trends and keyword performance analysis
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6`}>
              <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Months
              </h3>
              <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {totalMonths}
              </p>
            </div>

            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6`}>
              <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Avg. Keywords
              </h3>
              <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {avgKeywordCount}
              </p>
            </div>

            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6`}>
              <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Avg. Monthly Volume
              </h3>
              <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {avgVolume.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mb-6 flex justify-end">
            <button
              onClick={handleExport}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          <KeywordChart data={monthlyData} selectedBrand={decodedBrand} />
        </div>
      </div>

      <Footer theme={theme} />
    </>
  );
}
