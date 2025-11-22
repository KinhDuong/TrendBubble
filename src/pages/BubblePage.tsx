import { useState, useEffect } from 'react';
import BubbleChart from '../components/BubbleChart';
import FileUpload from '../components/FileUpload';
import { TrendingTopic } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';

type SortField = 'name' | 'category' | 'searchVolume' | 'rank' | 'pubDate' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface BubblePageProps {
  title: string;
  category?: string;
  source?: 'google_trends' | 'user_upload';
  userId?: string;
  showFileUpload?: boolean;
}

export default function BubblePage({
  title,
  category,
  source,
  userId,
  showFileUpload = false
}: BubblePageProps) {
  const { isAdmin } = useAuth();
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [maxBubbles, setMaxBubbles] = useState<number>(50);
  const [dateFilter, setDateFilter] = useState<'now' | 'all' | '24h' | 'week' | 'month' | 'year'>('now');
  const [categoryFilter, setCategoryFilter] = useState<string>(category || 'all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'google_trends' | 'user_upload'>(source || 'all');
  const [categories, setCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'bubble' | 'list'>('bubble');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [sortField, setSortField] = useState<SortField>('searchVolume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadTopics();
    loadThemePreference();
    loadCategories();
  }, []);

  useEffect(() => {
    loadTopics();
  }, [dateFilter, categoryFilter, sourceFilter, category, source, userId]);

  const loadThemePreference = async () => {
    try {
      const { data } = await supabase
        .from('user_preferences')
        .select('theme')
        .maybeSingle();

      if (data?.theme) {
        setTheme(data.theme as 'dark' | 'light');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const saveThemePreference = async (newTheme: 'dark' | 'light') => {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ id: 1, theme: newTheme });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    saveThemePreference(newTheme);
  };

  const loadTopics = async () => {
    try {
      let query = supabase
        .from('trending_topics')
        .select('*');

      // Apply prop-based filters (these are the page-specific filters)
      if (category) {
        query = query.eq('category', category);
      }

      if (source) {
        query = query.eq('source', source);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        // Only show public data if no userId specified
        query = query.is('user_id', null);
      }

      // Apply user-selected filters
      if (dateFilter === 'now') {
        const now = new Date();
        const recentDate = new Date();
        recentDate.setHours(now.getHours() - 12);
        query = query.gte('last_seen', recentDate.toISOString());
      } else if (dateFilter !== 'all') {
        const now = new Date();
        let startDate = new Date();

        switch (dateFilter) {
          case '24h':
            startDate.setHours(now.getHours() - 24);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }

        query = query.gte('first_seen', startDate.toISOString());
      }

      if (categoryFilter !== 'all' && !category) {
        query = query.eq('category', categoryFilter);
      }

      if (sourceFilter !== 'all' && !source) {
        query = query.eq('source', sourceFilter);
      }

      const { data, error } = await query.order('rank', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedTopics: TrendingTopic[] = data.map(topic => ({
          name: topic.name,
          searchVolume: topic.search_volume,
          searchVolumeRaw: topic.search_volume_raw,
          url: topic.url,
          createdAt: topic.created_at,
          pubDate: topic.pub_date,
          category: topic.category
        }));
        setTopics(formattedTopics);
      } else {
        setTopics([]);
      }
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      let query = supabase
        .from('trending_topics')
        .select('category')
        .not('category', 'is', null);

      // Apply same filters as loadTopics to get relevant categories
      if (source) {
        query = query.eq('source', source);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query.order('category');

      if (error) throw error;

      if (data) {
        const uniqueCategories = [...new Set(data.map(item => item.category).filter(Boolean))] as string[];
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleUploadSuccess = () => {
    setUploadMessage('File uploaded successfully!');
    loadTopics();
    loadCategories();
    setTimeout(() => setUploadMessage(null), 3000);
  };

  const getFilteredTopics = () => {
    let filtered = [...topics];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(topic =>
        topic.name.toLowerCase().includes(query) ||
        (topic.category && topic.category.toLowerCase().includes(query))
      );
    }

    filtered.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'category':
          aVal = (a.category || '').toLowerCase();
          bVal = (b.category || '').toLowerCase();
          break;
        case 'searchVolume':
          aVal = a.searchVolume;
          bVal = b.searchVolume;
          break;
        case 'pubDate':
          aVal = a.pubDate ? new Date(a.pubDate).getTime() : 0;
          bVal = b.pubDate ? new Date(b.pubDate).getTime() : 0;
          break;
        case 'createdAt':
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="opacity-50" />;
    }
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const filteredTopics = getFilteredTopics();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {!category && (
                <>
                  <label htmlFor="categoryFilter" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Category:</label>
                  <select
                    id="categoryFilter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    aria-label="Filter by category"
                  >
                    <option value="all">All</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </>
              )}

              {!source && (
                <>
                  <div className={`hidden md:block w-px h-6 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                  <label htmlFor="sourceFilter" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Source:</label>
                  <select
                    id="sourceFilter"
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value as 'all' | 'google_trends' | 'user_upload')}
                    className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    aria-label="Filter by source"
                  >
                    <option value="all">All Sources</option>
                    <option value="google_trends">Google Trends</option>
                    <option value="user_upload">User Upload</option>
                  </select>
                </>
              )}

              <div className={`hidden md:block w-px h-6 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
              <label htmlFor="dateFilter" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Time:</label>
              <select
                id="dateFilter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                aria-label="Filter by date range"
              >
                <option value="now">Now</option>
                <option value="24h">24 Hours</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
                <option value="all">All Time</option>
              </select>

              <div className={`hidden md:block w-px h-6 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
              <label htmlFor="searchQuery" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Search:</label>
              <div className="flex items-center gap-1">
                <input
                  id="searchQuery"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim()) {
                      setViewMode('list');
                    }
                  }}
                  placeholder="Search bubbles..."
                  className={`flex-1 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]`}
                  aria-label="Search trending topics"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setViewMode('bubble');
                    }}
                    className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-200'} rounded transition-colors`}
                    aria-label="Clear search and return to bubble view"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className={`hidden md:block w-px h-6 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
              <button
                onClick={() => setViewMode(viewMode === 'bubble' ? 'list' : 'bubble')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'bubble'
                    ? theme === 'dark'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                    : theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                aria-label={`Switch to ${viewMode === 'bubble' ? 'list' : 'bubble'} view`}
              >
                {viewMode === 'bubble' ? 'List' : 'Bubble'}
              </button>

              <div className={`hidden md:block w-px h-6 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
              <label htmlFor="maxBubbles" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Max:</label>
              <input
                id="maxBubbles"
                type="number"
                min="10"
                max="200"
                step="10"
                value={maxBubbles}
                onChange={(e) => setMaxBubbles(Number(e.target.value))}
                className={`w-16 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                aria-label="Maximum number of bubbles"
              />

              <div className={`hidden md:block w-px h-6 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
              <button
                onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {uploadMessage && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {uploadMessage}
          </div>
        )}

        {showFileUpload && isAdmin && (
          <div className="mb-6">
            <FileUpload onUploadSuccess={handleUploadSuccess} theme={theme} />
          </div>
        )}

        {loading ? (
          <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2">Loading trending topics...</p>
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <p>No trending topics found.</p>
          </div>
        ) : viewMode === 'bubble' ? (
          <BubbleChart
            topics={filteredTopics.slice(0, maxBubbles)}
            theme={theme}
          />
        ) : (
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}>
                  <tr>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wider cursor-pointer hover:bg-opacity-80`}
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Topic {getSortIcon('name')}
                      </div>
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wider cursor-pointer hover:bg-opacity-80`}
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center gap-1">
                        Category {getSortIcon('category')}
                      </div>
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wider cursor-pointer hover:bg-opacity-80`}
                      onClick={() => handleSort('searchVolume')}
                    >
                      <div className="flex items-center gap-1">
                        Search Volume {getSortIcon('searchVolume')}
                      </div>
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wider cursor-pointer hover:bg-opacity-80`}
                      onClick={() => handleSort('pubDate')}
                    >
                      <div className="flex items-center gap-1">
                        Pub Date {getSortIcon('pubDate')}
                      </div>
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wider cursor-pointer hover:bg-opacity-80`}
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center gap-1">
                        Created At {getSortIcon('createdAt')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {filteredTopics.slice(0, maxBubbles).map((topic, index) => (
                    <tr key={index} className={theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {topic.url ? (
                          <a
                            href={topic.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-400 hover:underline"
                          >
                            {topic.name}
                          </a>
                        ) : (
                          topic.name
                        )}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {topic.category || 'N/A'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {topic.searchVolumeRaw}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {topic.pubDate ? new Date(topic.pubDate).toLocaleString() : 'N/A'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {topic.createdAt ? new Date(topic.createdAt).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
