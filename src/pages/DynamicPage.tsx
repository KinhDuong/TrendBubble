import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import BubbleChart from '../components/BubbleChart';
import Footer from '../components/Footer';
import Header from '../components/Header';
import FilterMenu from '../components/FilterMenu';
import { TrendingTopic } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { TrendingUp } from 'lucide-react';

interface PageData {
  id: string;
  page_url: string;
  source: string;
  meta_title: string;
  meta_description: string;
  created_at: string;
}

function DynamicPage() {
  const { '*': urlPath } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [maxBubbles, setMaxBubbles] = useState<number>(50);
  const [dateFilter, setDateFilter] = useState<'now' | 'all' | '24h' | 'week' | 'month' | 'year'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'bubble' | 'list'>('bubble');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [nextBubbleIn, setNextBubbleIn] = useState<string>('');
  const [bubbleProgress, setBubbleProgress] = useState<number>(0);
  const [oldestBubbleTime, setOldestBubbleTime] = useState<number | null>(null);
  const [oldestBubbleCreated, setOldestBubbleCreated] = useState<number | null>(null);
  const [oldestBubbleLifetime, setOldestBubbleLifetime] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sources, setSources] = useState<Array<{value: string, label: string}>>([
    { value: 'all', label: 'All' },
    { value: 'google_trends', label: 'Google Trends' },
    { value: 'user_upload', label: 'My Uploads' }
  ]);
  const [latestPages, setLatestPages] = useState<PageData[]>([]);

  useEffect(() => {
    loadPageData();
    loadThemePreference();
    loadCategories();
    loadSources();
    loadLatestPages();
  }, [urlPath]);

  useEffect(() => {
    const bubbleInterval = setInterval(() => {
      if (oldestBubbleTime && oldestBubbleCreated && oldestBubbleLifetime) {
        const now = Date.now();
        const remaining = oldestBubbleTime - now;
        const elapsed = now - oldestBubbleCreated;
        const progress = Math.min(100, Math.max(0, (elapsed / oldestBubbleLifetime) * 100));

        setBubbleProgress(progress);

        if (remaining > 0) {
          const seconds = Math.ceil(remaining / 1000);
          setNextBubbleIn(`${seconds}s`);
        } else {
          setNextBubbleIn('0s');
        }
      } else {
        setNextBubbleIn('--');
        setBubbleProgress(0);
      }
    }, 100);
    return () => clearInterval(bubbleInterval);
  }, [oldestBubbleTime, oldestBubbleCreated, oldestBubbleLifetime]);

  useEffect(() => {
    if (pageData) {
      loadTopics();
    }
  }, [dateFilter, categoryFilter, pageData]);

  const loadPageData = async () => {
    try {
      const fullPath = '/' + (urlPath || '');
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('page_url', fullPath)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        navigate('/');
        return;
      }

      setPageData(data);
    } catch (error) {
      console.error('Error loading page data:', error);
      navigate('/');
    }
  };

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

  const handleBubbleTimingUpdate = (nextPopTime: number | null, createdTime?: number, lifetime?: number) => {
    setOldestBubbleTime(nextPopTime);
    setOldestBubbleCreated(createdTime || null);
    setOldestBubbleLifetime(lifetime || null);
  };

  const loadTopics = async () => {
    if (!pageData) return;

    try {
      let query = supabase
        .from('trending_topics')
        .select('*');

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

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (pageData.source !== 'all') {
        query = query.eq('source', pageData.source);
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
          category: topic.category,
          source: topic.source
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
      const { data, error } = await supabase
        .from('custom_categories')
        .select('name')
        .order('name');

      if (error) throw error;

      if (data) {
        const categoryNames = data.map(item => item.name);
        setCategories(categoryNames);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadSources = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_sources')
        .select('value, label')
        .order('label');

      if (error) throw error;

      const defaultSources = [
        { value: 'all', label: 'All' },
        { value: 'google_trends', label: 'Google Trends' },
        { value: 'user_upload', label: 'My Uploads' }
      ];

      if (data) {
        const customSources = data.map(item => ({ value: item.value, label: item.label }));
        setSources([...defaultSources, ...customSources]);
      } else {
        setSources(defaultSources);
      }
    } catch (error) {
      console.error('Error loading sources:', error);
    }
  };

  const loadLatestPages = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;

      if (data) {
        setLatestPages(data);
      }
    } catch (error) {
      console.error('Error loading latest pages:', error);
    }
  };

  if (!pageData) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const topTopics = [...topics].sort((a, b) => b.searchVolume - a.searchVolume).slice(0, 10);

  return (
    <>
      <Helmet>
        <title>{pageData.meta_title}</title>
        <meta name="description" content={pageData.meta_description} />
        <meta property="og:title" content={pageData.meta_title} />
        <meta property="og:description" content={pageData.meta_description} />
      </Helmet>

      <Header
        theme={theme}
        isAdmin={isAdmin}
        onLoginClick={() => {}}
        title={pageData.meta_title}
      />

      <FilterMenu
        theme={theme}
        loading={loading}
        viewMode={viewMode}
        dateFilter={dateFilter}
        categoryFilter={categoryFilter}
        categories={categories}
        maxBubbles={maxBubbles}
        searchQuery={searchQuery}
        nextBubbleIn={nextBubbleIn}
        bubbleProgress={bubbleProgress}
        onViewModeChange={setViewMode}
        onDateFilterChange={setDateFilter}
        onCategoryFilterChange={setCategoryFilter}
        onMaxBubblesChange={setMaxBubbles}
        onThemeChange={handleThemeChange}
        onSearchQueryChange={setSearchQuery}
        onSearchClear={() => {
          setSearchQuery('');
          setViewMode('bubble');
        }}
        onRefresh={loadTopics}
        variant="homepage"
      />

      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} px-2 md:px-6 py-2 md:py-6 pb-0`}>
        <main role="main" aria-label="Trending topics visualization">
          {loading && (
            <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</div>
          )}
          {!loading && (
            <>
              {topics.length > 0 && viewMode === 'bubble' && (
                <>
                  <BubbleChart topics={topics} maxDisplay={maxBubbles} theme={theme} onBubbleTimingUpdate={handleBubbleTimingUpdate} />

                  <div className={`w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} py-6 mt-8`}>
                    <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden">
                      <div className="flex items-center gap-4 min-w-0 flex-shrink-0">
                        <div className="relative w-12 h-12 flex-shrink-0 rounded-full shadow-lg border-4 border-gray-900 overflow-hidden flex items-center justify-center">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600"></div>
                          <TrendingUp size={24} strokeWidth={4} className="text-white relative z-10" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            TrendingBubble
                          </div>
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Real-time Trending Topics Visualization
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row items-center gap-4 min-w-0">
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} whitespace-nowrap`}>
                          <span className="font-medium">Source:</span> {sources.find(s => s.value === pageData.source)?.label || 'Custom'}
                        </div>
                        <a
                          href={typeof window !== 'undefined' ? window.location.href : '/'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors truncate max-w-xs`}
                        >
                          {typeof window !== 'undefined' ? window.location.host : 'trendingbubble.com'}
                        </a>
                      </div>
                    </div>
                  </div>

                  <section className="max-w-7xl mx-auto mt-8 mb-0 md:mb-8" aria-labelledby="top-trending-heading">
                    <h2 id="top-trending-heading" className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Top 10 Trending Topics
                    </h2>
                    <p className={`mb-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Discover the most popular trending topics ranked by search volume
                    </p>
                    <ol className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg overflow-hidden shadow-sm list-none`} itemScope itemType="https://schema.org/ItemList">
                      {topTopics.map((topic, index) => (
                        <li
                          key={index}
                          className={`px-6 py-4 flex items-center gap-4 ${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors ${index < 9 ? (theme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}
                          itemProp="itemListElement"
                          itemScope
                          itemType="https://schema.org/ListItem"
                        >
                          <meta itemProp="position" content={String(index + 1)} />
                          <div className={`w-12 flex items-center justify-center`} aria-label={`Rank ${index + 1}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'} shadow-md`}>
                              {index + 1}
                            </div>
                          </div>
                          <article className="flex-1" itemProp="item" itemScope itemType="https://schema.org/Thing">
                            <h3 className="font-semibold text-lg mb-1" itemProp="name">{topic.name.replace(/"/g, '')}</h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} itemProp="description">
                                {topic.searchVolumeRaw.replace(/"/g, '')} searches
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs ${topic.source === 'user_upload' ? (theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700')}`}>
                                {(() => {
                                  const found = sources.find(s => s.value === topic.source);
                                  if (found) return found.label;
                                  if (topic.source) return topic.source.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                                  return 'Trending';
                                })()}
                              </span>
                              {topic.category && (
                                <span className={`px-2 py-0.5 rounded text-xs ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                  {topic.category}
                                </span>
                              )}
                              {topic.pubDate && (
                                <time className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} dateTime={new Date(topic.pubDate).toISOString()}>
                                  {new Date(topic.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </time>
                              )}
                            </div>
                          </article>
                        </li>
                      ))}
                    </ol>
                  </section>
                </>
              )}
              {topics.length === 0 && !loading && (
                <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  No trending topics found for this source.
                </div>
              )}
            </>
          )}
          {latestPages.length > 0 && (
        <section className="max-w-7xl mx-auto mt-8 mb-8 px-4 md:px-6" aria-labelledby="latest-pages-heading">
          <h2 id="latest-pages-heading" className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Latest
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {latestPages.map((page) => {
              const sourceInfo = sources.find(s => s.value === page.source);
              return (
                <a
                  key={page.id}
                  href={page.page_url}
                  className={`group block ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'} rounded-lg overflow-hidden shadow-sm transition-all hover:shadow-md`}
                >
                  <div className="flex flex-row">
                    <div className={`w-2/5 ${theme === 'dark' ? 'bg-gradient-to-br from-blue-900 to-blue-800' : 'bg-gradient-to-br from-blue-100 to-blue-50'} flex items-center justify-center p-4`}>
                      <div className="text-center">
                        <div className={`text-4xl font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} mb-2`}>
                          {sourceInfo ? sourceInfo.label.substring(0, 2).toUpperCase() : page.source.substring(0, 2).toUpperCase()}
                        </div>
                        {sourceInfo && (
                          <div className={`text-xs font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                            {sourceInfo.label}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-3/5 p-4 flex flex-col justify-between">
                      <div>
                        <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                          {sourceInfo ? sourceInfo.label : page.source} <span className="mx-1">|</span> {new Date(page.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <h3 className={`font-bold text-base mb-2 ${theme === 'dark' ? 'text-white group-hover:text-blue-400' : 'text-gray-900 group-hover:text-blue-600'} transition-colors line-clamp-2`}>
                          {page.meta_title}
                        </h3>
                      </div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
                        {page.meta_description}
                      </p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}
        </main>
      </div>
      <Footer theme={theme} />
    </>
  );
}

export default DynamicPage;
