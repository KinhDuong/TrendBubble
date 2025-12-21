import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { TrendingUp, Download, Trash2, ExternalLink, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import BrandKeywordUpload from '../components/BrandKeywordUpload';
import KeywordChart from '../components/KeywordChart';
import ToolSchema from '../components/ToolSchema';
import Header from '../components/Header';
import UserLogin from '../components/UserLogin';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';

interface MonthlyData {
  id: string;
  brand: string;
  month: string;
  total_volume: number;
  keyword_count: number;
  top_keywords: Array<{ keyword: string; volume: number }>;
}

export default function InsightPage() {
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('brand_keyword_monthly_data')
        .select('*')
        .order('month', { ascending: true });

      if (error) throw error;

      if (data) {
        setMonthlyData(data);
        const uniqueBrands = Array.from(new Set(data.map(d => d.brand)));
        setBrands(uniqueBrands);
        if (uniqueBrands.length > 0 && !selectedBrand) {
          setSelectedBrand(uniqueBrands[0]);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedBrand) return;

    try {
      const { data, error } = await supabase
        .from('brand_keyword_data')
        .select('*')
        .eq('brand', selectedBrand)
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
      a.download = `${selectedBrand}-keywords.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedBrand) return;

    if (!confirm(`Delete all data for ${selectedBrand}? This cannot be undone.`)) {
      return;
    }

    try {
      await supabase
        .from('brand_keyword_data')
        .delete()
        .eq('brand', selectedBrand)
        .eq('user_id', user?.id);

      await supabase
        .from('brand_keyword_monthly_data')
        .delete()
        .eq('brand', selectedBrand)
        .eq('user_id', user?.id);

      await loadData();
      setSelectedBrand(null);
    } catch (error) {
      console.error('Error deleting data:', error);
    }
  };

  const handleLoginSuccess = () => {
    setShowLogin(false);
    loadData();
  };

  if (showLogin && !user) {
    return (
      <>
        <Header
          theme="light"
          isAdmin={isAdmin}
          onLoginClick={() => setShowLogin(true)}
          onLogout={logout}
        />
        <UserLogin onLogin={handleLoginSuccess} theme="light" />
        <Footer theme="light" />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Helmet>
          <title>Brand Keyword Insights | SEO Analysis</title>
          <meta name="description" content="Analyze and visualize brand keyword search trends and SEO performance data" />
        </Helmet>

        <ToolSchema
          name="Brand Keyword Insights - SEO Analysis Tool"
          description="Analyze and visualize brand keyword search trends and SEO performance data. Track search volume, monitor keyword performance, and optimize your content strategy."
          url={`${import.meta.env.VITE_BASE_URL || 'https://topbestcharts.com'}/insight`}
          applicationCategory="AnalysisApplication"
        />

        <Header
          theme="light"
          isAdmin={isAdmin}
          onLoginClick={() => setShowLogin(true)}
          onLogout={logout}
        />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Sign In Required</h2>
            <p className="text-gray-600 mb-4">Please sign in to access keyword insights</p>
            <button
              onClick={() => setShowLogin(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
        <Footer theme="light" />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Brand Keyword Insights | SEO Analysis</title>
        <meta name="description" content="Analyze and visualize brand keyword search trends and SEO performance data" />
      </Helmet>

      <ToolSchema
        name="Brand Keyword Insights - SEO Analysis Tool"
        description="Analyze and visualize brand keyword search trends and SEO performance data. Track search volume, monitor keyword performance, and optimize your content strategy."
        url={`${import.meta.env.VITE_BASE_URL || 'https://topbestcharts.com'}/insight`}
        applicationCategory="AnalysisApplication"
      />

      <Header
        theme="light"
        isAdmin={isAdmin}
        onLoginClick={() => setShowLogin(true)}
        onLogout={logout}
      />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Brand Keyword Insights</h1>
                <p className="text-gray-600">Upload and analyze keyword search volume data for your brands</p>
              </div>
              <button
                onClick={() => navigate('/insights-meta')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Database className="w-4 h-4" />
                View All Brands
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <BrandKeywordUpload onUploadComplete={loadData} theme="light" />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Brand Selection</h3>

              {brands.length > 0 ? (
                <>
                  <select
                    value={selectedBrand || ''}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {brands.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <button
                      onClick={handleExport}
                      disabled={!selectedBrand}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>

                    <button
                      onClick={handleDelete}
                      disabled={!selectedBrand}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>

                  {selectedBrand && monthlyData.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Summary</h4>
                      <div className="space-y-1 text-sm text-gray-600 mb-3">
                        <p>Total Months: {monthlyData.filter(d => d.brand === selectedBrand).length}</p>
                        <p>Avg. Keywords: {Math.round(
                          monthlyData
                            .filter(d => d.brand === selectedBrand)
                            .reduce((sum, d) => sum + d.keyword_count, 0) /
                          monthlyData.filter(d => d.brand === selectedBrand).length
                        )}</p>
                        <p>Avg. Volume: {Math.round(
                          monthlyData
                            .filter(d => d.brand === selectedBrand)
                            .reduce((sum, d) => sum + d.total_volume, 0) /
                          monthlyData.filter(d => d.brand === selectedBrand).length
                        ).toLocaleString()}</p>
                      </div>
                      <a
                        href={`/insight/${encodeURIComponent(selectedBrand)}`}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Brand Page
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">Upload data to get started</p>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading data...</p>
            </div>
          ) : monthlyData.length > 0 ? (
            <KeywordChart data={monthlyData} selectedBrand={selectedBrand} />
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Yet</h3>
              <p className="text-gray-600">Upload a CSV file to start analyzing keyword trends</p>
            </div>
          )}
        </div>
      </div>
      <Footer theme="light" />
    </>
  );
}
