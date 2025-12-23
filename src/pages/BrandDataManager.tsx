import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Login from '../components/Login';
import { Trash2, Search, Download, RefreshCw, Filter, Sparkles } from 'lucide-react';

interface BrandKeywordData {
  id: string;
  brand: string;
  keyword: string;
  search_volume: number;
  user_id: string;
  created_at: string;
  competition: string | null;
  ai_category: string | null;
  ai_insights: string | null;
  sentiment: number | null;
  Currency: string | null;
  'Avg. monthly searches': number | null;
  'Three month change': string | null;
  'YoY change': string | null;
  'Competition (indexed value)': number | null;
  'Top of page bid (low range)': number | null;
  'Top of page bid (high range)': number | null;
  'Ad impression share': string | null;
  'Organic impression share': string | null;
  'Organic average position': string | null;
  'In account?': string | null;
  'In plan?': string | null;
  [key: string]: any;
}

export default function BrandDataManager() {
  const { brandName } = useParams<{ brandName?: string }>();
  const navigate = useNavigate();
  const { isAdmin, user, logout } = useAuth();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'dark';
  });
  const [showLogin, setShowLogin] = useState(!isAdmin);
  const [data, setData] = useState<BrandKeywordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>(brandName ? decodeURIComponent(brandName) : 'all');
  const [brands, setBrands] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [aiCategorizing, setAiCategorizing] = useState(false);
  const [aiAnalyzingSentiment, setAiAnalyzingSentiment] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchBrands = async () => {
    try {
      const { data: keywordData, error } = await supabase
        .from('brand_keyword_data')
        .select('brand');

      if (error) throw error;

      const uniqueBrands = Array.from(new Set(keywordData?.map(d => d.brand) || []));
      setBrands(uniqueBrands.sort());
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const fetchData = async () => {
    if (!brandName) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const decodedBrand = decodeURIComponent(brandName);
      const { data: keywordData, error } = await supabase
        .from('brand_keyword_data')
        .select('*')
        .eq('brand', decodedBrand)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setData(keywordData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setShowLogin(true);
    } else {
      setShowLogin(false);
      fetchBrands();
      fetchData();
    }
  }, [isAdmin, brandName]);

  useEffect(() => {
    if (brandName) {
      const decoded = decodeURIComponent(brandName);
      setSelectedBrand(decoded);
    } else {
      setSelectedBrand('all');
    }
  }, [brandName]);

  const handleLogin = () => {
    setShowLogin(false);
    window.location.reload();
  };

  if (!isAdmin && showLogin) {
    return <Login onLogin={handleLogin} theme={theme} />;
  }

  if (!isAdmin) {
    navigate('/');
    return null;
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const { error } = await supabase
        .from('brand_keyword_data')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setData(data.filter(d => d.id !== id));
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Failed to delete record');
    }
  };

  const handleDeleteBrand = async (brand: string) => {
    if (!confirm(`Are you sure you want to delete all data for "${brand}"?`)) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('brand_keyword_data')
        .delete()
        .eq('brand', brand)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchData();
      setSelectedBrand('all');
    } catch (error) {
      console.error('Error deleting brand:', error);
      alert('Failed to delete brand data');
    }
  };

  const handleAICategorization = async () => {
    if (selectedBrand === 'all') {
      setAiMessage({ type: 'error', text: 'Please select a specific brand to categorize' });
      setTimeout(() => setAiMessage(null), 5000);
      return;
    }

    if (!confirm(`This will use AI to analyze and categorize all keywords for "${selectedBrand}". This may take a moment and will use OpenAI API credits. Continue?`)) {
      return;
    }

    setAiCategorizing(true);
    setAiMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/categorize-keywords-ai`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brand: selectedBrand })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to categorize keywords'}`);
      }

      const result = await response.json();

      if (!result.success) {
        if (result.errorCode === 'MISSING_API_KEY') {
          throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your Supabase Edge Function secrets.');
        }
        throw new Error(result.error || 'Failed to categorize keywords');
      }

      await fetchData();

      setAiMessage({
        type: 'success',
        text: result.message || `Successfully categorized ${result.updatedCount} of ${result.totalKeywords} keywords!${result.hasMoreToProcess ? ' Click again to continue processing.' : ''}`
      });

      setTimeout(() => setAiMessage(null), 15000);
    } catch (error: any) {
      console.error('Error during AI categorization:', error);
      setAiMessage({
        type: 'error',
        text: error.message || 'Failed to categorize keywords. Please check console for details.'
      });
      setTimeout(() => setAiMessage(null), 10000);
    } finally {
      setAiCategorizing(false);
    }
  };

  const handleSentimentAnalysis = async () => {
    if (selectedBrand === 'all') {
      setAiMessage({ type: 'error', text: 'Please select a specific brand to analyze' });
      setTimeout(() => setAiMessage(null), 5000);
      return;
    }

    if (!confirm(`This will use AI to analyze the sentiment of all keywords for "${selectedBrand}". This may take a moment and will use OpenAI API credits. Continue?`)) {
      return;
    }

    setAiAnalyzingSentiment(true);
    setAiMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-sentiment-ai`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brand: selectedBrand })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to analyze sentiment'}`);
      }

      const result = await response.json();

      if (!result.success) {
        if (result.errorCode === 'MISSING_API_KEY') {
          throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your Supabase Edge Function secrets.');
        }
        throw new Error(result.error || 'Failed to analyze sentiment');
      }

      await fetchData();

      setAiMessage({
        type: 'success',
        text: result.message || `Successfully analyzed ${result.updatedCount} of ${result.totalKeywords} keywords!${result.hasMoreToProcess ? ' Click again to continue processing.' : ''}`
      });

      setTimeout(() => setAiMessage(null), 15000);
    } catch (error: any) {
      console.error('Error during sentiment analysis:', error);
      setAiMessage({
        type: 'error',
        text: error.message || 'Failed to analyze sentiment. Please check console for details.'
      });
      setTimeout(() => setAiMessage(null), 10000);
    } finally {
      setAiAnalyzingSentiment(false);
    }
  };

  const exportToCSV = () => {
    const filteredData = getFilteredData();
    if (filteredData.length === 0) return;

    const allColumns = Object.keys(filteredData[0]);
    const csvHeader = allColumns.join(',');
    const csvRows = filteredData.map(row =>
      allColumns.map(col => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
      }).join(',')
    );

    const csv = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brand-keyword-data-${selectedBrand}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getFilteredData = () => {
    let filtered = [...data];

    if (selectedBrand !== 'all') {
      filtered = filtered.filter(d => d.brand === selectedBrand);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        d.keyword?.toLowerCase().includes(term) ||
        d.brand?.toLowerCase().includes(term)
      );
    }

    filtered.sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (sortDirection === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });

    return filtered;
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getAllColumns = () => {
    if (data.length === 0) return [];

    const priorityColumns = [
      'brand',
      'keyword',
      'ai_category',
      'sentiment',
      'ai_insights',
      'Currency',
      'Avg. monthly searches',
      'Three month change',
      'YoY change',
      'competition',
      'Competition (indexed value)',
      'Top of page bid (low range)',
      'Top of page bid (high range)',
    ];

    const monthColumns = Object.keys(data[0])
      .filter(key => key.startsWith('Searches: '))
      .sort();

    const otherColumns = Object.keys(data[0])
      .filter(key =>
        !priorityColumns.includes(key) &&
        !monthColumns.includes(key) &&
        !['id', 'user_id', 'created_at', 'search_volume', 'competition', 'ai_category', 'ai_insights', 'sentiment'].includes(key)
      );

    return [...priorityColumns, ...monthColumns, ...otherColumns];
  };

  const formatValue = (value: any, column: string): string => {
    if (value === null || value === undefined) return '-';

    if (column === 'sentiment' && typeof value === 'number') {
      const percentage = Math.round(((value + 1) / 2) * 100);
      return `${percentage}%`;
    }

    if (typeof value === 'number') {
      if (value >= 1000) {
        return value.toLocaleString();
      }
      return value.toString();
    }
    return String(value);
  };

  const getSentimentColor = (sentiment: number | null): string => {
    if (sentiment === null || sentiment === undefined) return 'bg-gray-200';

    const percentage = ((sentiment + 1) / 2) * 100;

    if (percentage >= 70) return 'bg-green-500';
    if (percentage >= 55) return 'bg-green-400';
    if (percentage >= 45) return 'bg-yellow-400';
    if (percentage >= 30) return 'bg-orange-400';
    return 'bg-red-500';
  };

  const filteredData = getFilteredData();
  const columns = getAllColumns();

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Header
          theme={theme}
          isAdmin={isAdmin}
          isLoggedIn={!!user}
          onLoginClick={() => setShowLogin(true)}
          onLogout={logout}
          title="Brand Keyword Data Manager"
        />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Loading data...</p>
          </div>
        </div>
        <Footer theme={theme} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header
        theme={theme}
        isAdmin={isAdmin}
        isLoggedIn={!!user}
        onLoginClick={() => setShowLogin(true)}
        onLogout={logout}
        title="Brand Keyword Data Manager"
      />
      <div className="py-8">
        <div className="max-w-[98%] mx-auto px-4">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Brand Keyword Data Manager</h1>
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  {brandName
                    ? `Viewing data for: ${selectedBrand}`
                    : 'View and manage all uploaded brand keyword data'}
                </p>
              </div>
              {brandName && (
                <button
                  onClick={() => navigate('/admin/brand-data')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  ← Back to Brands
                </button>
              )}
            </div>
          </div>

          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6 mb-6`}>
            <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search keywords or brands..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {!brandName && (
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={selectedBrand}
                  onChange={(e) => {
                    const brand = e.target.value;
                    if (brand !== 'all') {
                      navigate(`/admin/brand-data/${encodeURIComponent(brand)}`);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Select a Brand...</option>
                  {brands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>
            )}

            {brandName && (
              <button
                onClick={fetchData}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Refresh
              </button>
            )}

            <button
              onClick={exportToCSV}
              disabled={!brandName || filteredData.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </button>
          </div>

          {brandName && (
            <>
              {aiMessage && (
                <div className={`mb-4 p-4 rounded-lg ${aiMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {aiMessage.text}
                </div>
              )}

              <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-purple-900 mb-1">AI Keyword Analysis</h3>
                    <p className="text-sm text-purple-700 mb-3">
                      Use AI to analyze your keywords. Categorization assigns growth categories based on Google Trends insights
                      (Explosive Growth, Rising Star, etc.) with strategic insights. Sentiment Analysis evaluates keyword sentiment
                      from negative to positive as a percentage.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleAICategorization}
                        disabled={aiCategorizing || aiAnalyzingSentiment}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {aiCategorizing ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Analyzing with AI...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Generate AI Categories
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleSentimentAnalysis}
                        disabled={aiCategorizing || aiAnalyzingSentiment}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {aiAnalyzingSentiment ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Analyzing Sentiment...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Sentiment Analysis
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Showing <span className="font-semibold">{filteredData.length}</span> of <span className="font-semibold">{data.length}</span> records
                </p>

                <button
                  onClick={() => handleDeleteBrand(selectedBrand)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All {selectedBrand} Data
                </button>
              </div>
            </>
          )}
        </div>

        {!brandName ? (
          <div className={`${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'} rounded-lg shadow-sm p-12 text-center`}>
            <Filter className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">Select a Brand to View Data</p>
            <p className="text-sm">Choose a brand from the dropdown above to load and manage keyword data.</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className={`${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'} rounded-lg shadow-sm p-12 text-center`}>
            <p className="text-lg">No data found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700 border-r border-gray-200 z-10">
                      Actions
                    </th>
                    {columns.map(column => (
                      <th
                        key={column}
                        onClick={() => handleSort(column)}
                        className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className={`flex flex-col gap-1 ${column === 'ai_insights' ? 'min-w-[400px]' : 'min-w-[180px]'}`}>
                          <div className="flex items-center gap-2">
                            <span className="whitespace-nowrap">{column}</span>
                            {sortColumn === column && (
                              <span className="text-blue-600">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-normal text-gray-500 whitespace-nowrap">
                            DB: {column}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredData.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="sticky left-0 bg-white px-4 py-3 border-r border-gray-200 z-10">
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                      {columns.map(column => (
                        <td key={column} className={`px-4 py-3 text-gray-900 ${column === 'ai_insights' ? 'max-w-md' : 'whitespace-nowrap'}`}>
                          {column === 'sentiment' && row[column] !== null && row[column] !== undefined ? (
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-6 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${getSentimentColor(row[column])} transition-all`}
                                  style={{ width: `${Math.round(((row[column] + 1) / 2) * 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{formatValue(row[column], column)}</span>
                            </div>
                          ) : (
                            formatValue(row[column], column)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Column Information</h3>
          <p className="text-sm text-blue-800 mb-2">Total Columns: {columns.length + 4} (including internal fields)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
            <div>
              <strong>Core Fields:</strong> brand, keyword, Currency, Avg. monthly searches
            </div>
            <div>
              <strong>Metrics:</strong> Three month change, YoY change, Competition
            </div>
            <div>
              <strong>Bidding:</strong> Top of page bid (low/high range), Competition indexed
            </div>
            <div>
              <strong>Monthly Data:</strong> {Object.keys(data[0] || {}).filter(k => k.startsWith('Searches:')).length} months tracked
            </div>
          </div>
        </div>
        </div>
      </div>
      <Footer theme={theme} />
    </div>
  );
}
