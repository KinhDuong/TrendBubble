import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import BubbleChart from '../components/BubbleChart';
import Footer from '../components/Footer';
import Header from '../components/Header';
import FilterMenu, { BubbleLayout } from '../components/FilterMenu';
import ComparisonPanel from '../components/ComparisonPanel';
import ShareSnapshot from '../components/ShareSnapshot';
import AnimationSelector, { AnimationStyle } from '../components/AnimationSelector';
import { TrendingTopic, CryptoTimeframe } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { TrendingUp, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type SortField = 'name' | 'category' | 'searchVolume' | 'rank' | 'pubDate' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface PageData {
  id: string;
  page_url: string;
  source: string;
  meta_title: string;
  meta_description: string;
  created_at: string;
  summary?: string;
}

function DynamicPage() {
  const { '*': urlPath } = useParams();
  const navigate = useNavigate();
  const { isAdmin, logout } = useAuth();
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const isMobile = window.innerWidth < 768;
  const [maxBubbles, setMaxBubbles] = useState<number>(isMobile ? 40 : 100);
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
  const [sortField, setSortField] = useState<SortField>('searchVolume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [comparingTopics, setComparingTopics] = useState<Set<string>>(new Set());
  const [bubbleLayout, setBubbleLayout] = useState<BubbleLayout>('force');
  const [showFullList, setShowFullList] = useState<boolean>(false);
  const [cryptoTimeframe, setCryptoTimeframe] = useState<CryptoTimeframe>('1h');
  const bubbleChartRef = useRef<HTMLDivElement>(null);
  const [animationStyle, setAnimationStyle] = useState<AnimationStyle>('default');

  const sortedTopics = useMemo(() => {
    if (pageData?.source !== 'coingecko_crypto' || !topics.length) {
      return topics;
    }

    return [...topics].sort((a, b) => {
      if (!a.crypto_data || !b.crypto_data) return 0;

      const timeframeMap = {
        '1h': 'change_1h',
        '24h': 'change_24h',
        '7d': 'change_7d',
        '30d': 'change_30d',
        '1y': 'change_1y',
      } as const;

      const fieldName = timeframeMap[cryptoTimeframe];
      const aValue = Math.abs(a.crypto_data[fieldName]);
      const bValue = Math.abs(b.crypto_data[fieldName]);

      return bValue - aValue;
    });
  }, [topics, cryptoTimeframe, pageData?.source]);

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
        setPageData(null);
        setLoading(false);
        return;
      }

      setPageData(data);
    } catch (error) {
      console.error('Error loading page data:', error);
      setPageData(null);
      setLoading(false);
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
          source: topic.source,
          crypto_data: topic.crypto_data
        }));

        const sortedTopics = [...formattedTopics].sort((a, b) => {
          const aValue = a.searchVolumeRaw ?? a.searchVolume;
          const bValue = b.searchVolumeRaw ?? b.searchVolume;
          return bValue - aValue;
        });

        setTopics(sortedTopics);
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
        .limit(10);

      if (error) throw error;

      if (data) {
        setLatestPages(data);
      }
    } catch (error) {
      console.error('Error loading latest pages:', error);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getFilteredTopics = () => {
    return topics.filter(topic => {
      const matchesSearch = !searchQuery || topic.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || topic.category === categoryFilter;
      const matchesSource = sourceFilter === 'all' || topic.source === sourceFilter;
      return matchesSearch && matchesCategory && matchesSource;
    });
  };

  const getSortedTopics = () => {
    const filtered = getFilteredTopics();
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'category':
          aValue = (a.category || '').toLowerCase();
          bValue = (b.category || '').toLowerCase();
          break;
        case 'searchVolume':
          aValue = a.searchVolume;
          bValue = b.searchVolume;
          break;
        case 'rank':
          aValue = topics.indexOf(a);
          bValue = topics.indexOf(b);
          break;
        case 'pubDate':
          aValue = a.pubDate ? new Date(a.pubDate).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          bValue = b.pubDate ? new Date(b.pubDate).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          break;
        case 'createdAt':
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="opacity-50" />;
    }
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <>
        <Header
          theme={theme}
          isAdmin={isAdmin}
          onLoginClick={() => {}}
          onLogout={logout}
          title="Trending Bubble"
        />
        <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} px-4`}>
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold mb-4">Page not found</h1>
            <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Looks like you've followed a broken link or entered a URL that doesn't exist on this site.
            </p>
            <a
              href="/"
              className={`inline-block px-6 py-3 rounded-lg font-semibold transition-colors ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow text-white'}`}
            >
              Back to home
            </a>
          </div>
        </div>
        <Footer theme={theme} />
      </>
    );
  }

  const topTopics = [...topics].sort((a, b) => b.searchVolume - a.searchVolume);

  // For crypto pages, split into gainers and losers
  const isCryptoPage = pageData?.source === 'coingecko_crypto';
  let topGainers: TrendingTopic[] = [];
  let topLosers: TrendingTopic[] = [];

  if (isCryptoPage) {
    const getCryptoChange = (topic: TrendingTopic): number => {
      if (!topic.crypto_data) return 0;
      const timeframeMap = {
        '1h': 'change_1h',
        '24h': 'change_24h',
        '7d': 'change_7d',
        '30d': 'change_30d',
        '1y': 'change_1y',
      };
      const field = timeframeMap[cryptoTimeframe] as keyof typeof topic.crypto_data;
      return topic.crypto_data[field] || 0;
    };

    const sortedByChange = [...topics].sort((a, b) => getCryptoChange(b) - getCryptoChange(a));
    topGainers = sortedByChange.filter(t => getCryptoChange(t) > 0).slice(0, showFullList ? sortedByChange.length : 10);
    topLosers = sortedByChange.filter(t => getCryptoChange(t) < 0).slice(-10).reverse();
  }

  const displayTopics = showFullList ? topTopics : topTopics.slice(0, 10);
  const topTopicNames = topTopics.slice(0, 5).map(t => t.name.replace(/"/g, '')).join(', ');
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const lastUpdated = topics.length > 0 ? new Date(Math.max(...topics.map(t => new Date(t.pubDate || t.createdAt || Date.now()).getTime()))) : new Date();

  const pageUrl = typeof window !== 'undefined' ? window.location.href : `https://googletrendingtopics.com/${pageData.page_url}`;
  const sourceName = sources.find(s => s.value === pageData.source)?.label || 'Custom';

  const extractTopicType = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('trending topics')) {
      return title.replace(/trending topics/i, '').trim();
    }
    return title;
  };

  const topicType = extractTopicType(pageData.meta_title);
  const top10Title = showFullList
    ? `All ${topicType || 'Trending Topics'}`
    : `Top 10 ${topicType || 'Trending Topics'}`;

  const enhancedTitle = `${pageData.meta_title} - ${currentDate}`;
  const enhancedDescription = topTopicNames
    ? `${pageData.meta_description} Top trending: ${topTopicNames}. Updated ${lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}.`
    : pageData.meta_description;

  const keywords = topTopics.slice(0, 10).map(t => t.name.replace(/"/g, '')).join(', ') + ', trending topics, search trends, real-time trends, trend analysis';

  return (
    <>
      <Helmet>
        <title>{enhancedTitle}</title>
        <meta name="description" content={enhancedDescription} />
        <meta name="keywords" content={keywords} />
        <meta name="author" content="Google Trending Topics" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <link rel="canonical" href={pageUrl} />

        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={enhancedTitle} />
        <meta property="og:description" content={enhancedDescription} />
        <meta property="og:site_name" content="Google Trending Topics" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:updated_time" content={lastUpdated.toISOString()} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={pageUrl} />
        <meta name="twitter:title" content={enhancedTitle} />
        <meta name="twitter:description" content={enhancedDescription} />

        <meta property="article:published_time" content={pageData.created_at} />
        <meta property="article:modified_time" content={lastUpdated.toISOString()} />
        <meta property="article:section" content="Trending Topics" />
        <meta property="article:tag" content={topTopicNames} />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": enhancedTitle,
            "description": enhancedDescription,
            "url": pageUrl,
            "datePublished": pageData.created_at,
            "dateModified": lastUpdated.toISOString(),
            "author": {
              "@type": "Organization",
              "name": "Google Trending Topics"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Google Trending Topics",
              "url": "https://googletrendingtopics.com"
            },
            "breadcrumb": {
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": "https://googletrendingtopics.com"
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": pageData.meta_title,
                  "item": pageUrl
                }
              ]
            },
            "mainEntity": {
              "@type": "ItemList",
              "name": "Top Trending Topics",
              "description": "Current trending topics ranked by search volume",
              "numberOfItems": topTopics.length,
              "itemListElement": topTopics.map((topic, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                  "@type": "Thing",
                  "name": topic.name.replace(/"/g, ''),
                  "description": `${topic.searchVolumeRaw.replace(/"/g, '')} searches`
                }
              }))
            }
          })}
        </script>

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": `What are the top trending topics for ${sourceName}?`,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": `The top trending topics for ${sourceName} as of ${currentDate} are: ${topTopicNames}. These topics are ranked by search volume and updated in real-time.`
                }
              },
              {
                "@type": "Question",
                "name": "How often is this trending data updated?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Our trending topics data is updated in real-time, with the latest update at " + lastUpdated.toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) + " ET."
                }
              },
              {
                "@type": "Question",
                "name": "What does search volume mean?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Search volume indicates how many times a topic has been searched. Higher search volumes indicate more popular and trending topics that are capturing public attention."
                }
              }
            ]
          })}
        </script>
      </Helmet>

      <Header
        theme={theme}
        isAdmin={isAdmin}
        onLoginClick={() => {}}
        onLogout={logout}
        title="Trending Bubble"
snapshotButton={null}
      />

      <FilterMenu
        theme={theme}
        loading={loading}
        viewMode={viewMode}
        dateFilter={dateFilter}
        categoryFilter={categoryFilter}
        categories={categories}
        sourceFilter={sourceFilter}
        sources={sources.map(s => s.value)}
        maxBubbles={maxBubbles}
        searchQuery={searchQuery}
        nextBubbleIn={nextBubbleIn}
        bubbleProgress={bubbleProgress}
        bubbleLayout={bubbleLayout}
        cryptoTimeframe={cryptoTimeframe}
        showCryptoTimeframe={pageData?.source === 'coingecko_crypto'}
        onViewModeChange={setViewMode}
        onDateFilterChange={setDateFilter}
        onCategoryFilterChange={setCategoryFilter}
        onSourceFilterChange={setSourceFilter}
        onMaxBubblesChange={setMaxBubbles}
        onThemeChange={handleThemeChange}
        onSearchQueryChange={setSearchQuery}
        onSearchClear={() => {
          setSearchQuery('');
          setViewMode('bubble');
        }}
        onRefresh={loadTopics}
        onBubbleLayoutChange={setBubbleLayout}
        onCryptoTimeframeChange={setCryptoTimeframe}
        variant="homepage"
      />

      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} px-2 md:px-6 py-2 md:py-6 pb-0`}>
        <main role="main" aria-label="Trending topics visualization">
          {loading && (
            <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</div>
          )}
          {!loading && (
            <>
              {topics.length > 0 && (
                <article className="max-w-7xl mx-auto mb-8">
                  <header>
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <h1 className={`text-3xl md:text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {pageData.meta_title}
                      </h1>
                      {viewMode === 'bubble' && topics.length > 0 && (
                        <div className="flex items-center gap-2">
                          <AnimationSelector
                            theme={theme}
                            selectedAnimation={animationStyle}
                            onAnimationChange={setAnimationStyle}
                          />
                          <ShareSnapshot theme={theme} canvasRef={bubbleChartRef} variant="inline" />
                        </div>
                      )}
                    </div>
                    <div className={`flex flex-wrap items-center gap-3 mb-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      <time dateTime={lastUpdated.toISOString()}>
                        Last updated: {lastUpdated.toLocaleString('en-US', {
                          timeZone: 'America/New_York',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })} ET
                      </time>
                      <span className={`px-2 py-1 rounded text-xs ${theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                        {topics.length} trending topics
                      </span>
                    </div>
                  </header>
                </article>
              )}
              {topics.length > 0 && viewMode === 'bubble' && (
                <>
                  <div ref={bubbleChartRef}>
                    <BubbleChart
                      topics={sortedTopics}
                      maxDisplay={maxBubbles}
                      theme={theme}
                      layout={bubbleLayout}
                      onBubbleTimingUpdate={handleBubbleTimingUpdate}
                      comparingTopics={comparingTopics}
                      onComparingTopicsChange={setComparingTopics}
                      useCryptoColors={pageData?.source === 'coingecko_crypto'}
                      cryptoTimeframe={cryptoTimeframe}
                      animationStyle={animationStyle}
                    />
                  </div>

                  {pageData.summary && (
                    <section
                      className="max-w-7xl mx-auto mt-8 mb-6"
                      aria-labelledby="page-summary"
                      itemScope
                      itemType="https://schema.org/Article"
                    >
                      <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-6`}>
                        <div
                          itemProp="articleBody"
                          className={`
                            prose ${theme === 'dark' ? 'prose-invert' : ''} max-w-none
                            ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}
                            prose-headings:${theme === 'dark' ? 'text-white' : 'text-gray-900'}
                            prose-p:leading-relaxed
                            prose-a:${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}
                            prose-strong:${theme === 'dark' ? 'text-white' : 'text-gray-900'}
                            prose-em:${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}
                            prose-ul:${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}
                            prose-ol:${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}
                            prose-li:${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}
                            prose-blockquote:${theme === 'dark' ? 'text-gray-400 border-gray-600' : 'text-gray-600 border-gray-300'}
                            prose-table:${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}
                            prose-th:${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}
                            prose-td:${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}
                            prose-img:rounded-lg
                            prose-code:${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-900'}
                            prose-pre:${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}
                          `}
                          dangerouslySetInnerHTML={{ __html: pageData.summary }}
                        />
                        <meta itemProp="author" content="Google Trending Topics" />
                        <meta itemProp="datePublished" content={pageData.created_at} />
                      </div>
                    </section>
                  )}

                  <div className={`w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-t border-b py-6 mt-8`}>
                    <div className="max-w-7xl mx-auto px-4">
                      <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Featured
                      </h2>
                      {latestPages.length > 0 && (
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {latestPages.map((page) => (
                            <a
                              key={page.id}
                              href={page.page_url}
                              className={`text-sm ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors hover:underline`}
                            >
                              {page.meta_title}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <section className="max-w-7xl mx-auto mt-8 mb-0 md:mb-8" aria-labelledby="top-trending-heading">
                    {!isCryptoPage && (
                      <>
                        <h2 id="top-trending-heading" className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {top10Title}
                        </h2>
                        {topTopicNames && (
                          <p className={`mb-4 text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            Currently trending: <strong className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>{topTopicNames}</strong>.
                            Explore our interactive visualization to discover real-time search trends, analyze topic popularity, and stay updated with what's capturing attention right now.
                          </p>
                        )}
                      </>
                    )}
                    {isCryptoPage && (
                      <>
                        <h2 id="top-trending-heading" className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          Top 10 Gainers & Losers
                        </h2>
                        {topGainers.length > 0 && topLosers.length > 0 && (() => {
                          const timeframeLabel = cryptoTimeframe === '1h' ? '1-hour' : cryptoTimeframe === '24h' ? '24-hour' : cryptoTimeframe === '7d' ? '7-day' : cryptoTimeframe === '30d' ? '30-day' : '1-year';
                          const topGainer = topGainers[0];
                          const topLoser = topLosers[0];
                          const gainerChange = topGainer?.crypto_data?.[`change_${cryptoTimeframe}` as keyof typeof topGainer.crypto_data] as number || 0;
                          const loserChange = topLoser?.crypto_data?.[`change_${cryptoTimeframe}` as keyof typeof topLoser.crypto_data] as number || 0;
                          const gainerName = topGainer?.name.replace(/"/g, '') || '';
                          const loserName = topLoser?.name.replace(/"/g, '') || '';

                          return (
                            <p className={`mb-6 text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              Track the biggest movers in cryptocurrency markets right now. Leading the gainers is <strong className={theme === 'dark' ? 'text-green-400' : 'text-green-600'}>{gainerName}</strong> with a {timeframeLabel} gain of <strong className={theme === 'dark' ? 'text-green-400' : 'text-green-600'}>+{gainerChange.toFixed(2)}%</strong>, while <strong className={theme === 'dark' ? 'text-red-400' : 'text-red-600'}>{loserName}</strong> leads the decline with <strong className={theme === 'dark' ? 'text-red-400' : 'text-red-600'}>{loserChange.toFixed(2)}%</strong> change. Monitor real-time cryptocurrency price movements, analyze market trends, and discover top performing digital assets. Updated every 5 minutes with live data from CoinGecko, our cryptocurrency tracker helps you identify trading opportunities and stay informed about market volatility across Bitcoin, Ethereum, and thousands of altcoins.
                            </p>
                          );
                        })()}
                      </>
                    )}

                    {!isCryptoPage && (
                      <>
                        <ol className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-md border border-gray-200'} rounded-lg overflow-hidden list-none`} itemScope itemType="https://schema.org/ItemList">
                          {displayTopics.map((topic, index) => (
                          <li
                            key={index}
                            className={`px-6 py-4 flex items-center gap-4 ${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors ${index < displayTopics.length - 1 ? (theme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}
                            itemProp="itemListElement"
                            itemScope
                            itemType="https://schema.org/ListItem"
                          >
                            <meta itemProp="position" content={String(index + 1)} />
                            <div className={`w-12 flex items-center justify-center`} aria-label={`Rank ${index + 1}`}>
                              <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
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
                        {topTopics.length > 10 && (
                          <div className="mt-4 text-center">
                            <button
                              onClick={() => setShowFullList(!showFullList)}
                              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow text-white'}`}
                            >
                              {showFullList ? 'Show Top 10 Only' : 'See Full List'}
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {isCryptoPage && (
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Top Gainers */}
                        <div>
                          <h3 className={`text-xl font-bold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                            <ArrowUp size={24} />
                            Top 10 Gainers ({cryptoTimeframe.toUpperCase()})
                          </h3>
                          <ol className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-md border border-gray-200'} rounded-lg overflow-hidden list-none`}>
                            {topGainers.map((topic, index) => {
                              const change = topic.crypto_data?.[`change_${cryptoTimeframe}` as keyof typeof topic.crypto_data] || 0;
                              return (
                                <li
                                  key={index}
                                  className={`px-4 py-3 flex items-center gap-3 ${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors ${index < topGainers.length - 1 ? (theme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}
                                >
                                  <div className={`w-8 flex items-center justify-center`}>
                                    <div className={`text-lg font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {index + 1}
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold mb-1">{topic.name.replace(/"/g, '')}</h4>
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-green-500 font-bold">
                                        +{typeof change === 'number' ? change.toFixed(2) : change}%
                                      </span>
                                      {topic.crypto_data?.formatted?.price && (
                                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                                          {topic.crypto_data.formatted.price}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ol>
                        </div>

                        {/* Top Losers */}
                        <div>
                          <h3 className={`text-xl font-bold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                            <ArrowDown size={24} />
                            Top 10 Losers ({cryptoTimeframe.toUpperCase()})
                          </h3>
                          <ol className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-md border border-gray-200'} rounded-lg overflow-hidden list-none`}>
                            {topLosers.map((topic, index) => {
                              const change = topic.crypto_data?.[`change_${cryptoTimeframe}` as keyof typeof topic.crypto_data] || 0;
                              return (
                                <li
                                  key={index}
                                  className={`px-4 py-3 flex items-center gap-3 ${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors ${index < topLosers.length - 1 ? (theme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}
                                >
                                  <div className={`w-8 flex items-center justify-center`}>
                                    <div className={`text-lg font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {index + 1}
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold mb-1">{topic.name.replace(/"/g, '')}</h4>
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-red-500 font-bold">
                                        {typeof change === 'number' ? change.toFixed(2) : change}%
                                      </span>
                                      {topic.crypto_data?.formatted?.price && (
                                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                                          {topic.crypto_data.formatted.price}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      </div>
                    )}
                  </section>
                </>
              )}
              {topics.length > 0 && viewMode === 'list' && (
              <div className="max-w-7xl mx-auto">
                <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-md'} rounded-lg border overflow-hidden`}>
                  <div className={`hidden md:grid grid-cols-5 gap-4 px-6 py-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200'} font-semibold text-sm`}>
                    <button
                      onClick={() => handleSort('name')}
                      className={`flex items-center gap-1 hover:${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} transition-colors`}
                    >
                      Topic <SortIcon field="name" />
                    </button>
                    <button
                      onClick={() => handleSort('searchVolume')}
                      className={`flex items-center justify-center gap-1 hover:${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} transition-colors`}
                    >
                      Search Volume <SortIcon field="searchVolume" />
                    </button>
                    <button
                      onClick={() => handleSort('rank')}
                      className={`flex items-center justify-center gap-1 hover:${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} transition-colors`}
                    >
                      Rank <SortIcon field="rank" />
                    </button>
                    <div className="text-center">Source</div>
                    <button
                      onClick={() => handleSort('pubDate')}
                      className={`flex items-center justify-center gap-1 hover:${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} transition-colors`}
                    >
                      Started (ET) <SortIcon field="pubDate" />
                    </button>
                  </div>
                  <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {getSortedTopics().map((topic, index) => (
                      <div key={index} className={`${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors`}>
                        <div className="hidden md:grid grid-cols-5 gap-4 px-6 py-4">
                          <div className="font-medium">{topic.name.replace(/"/g, '')}</div>
                          <div className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{topic.searchVolumeRaw.replace(/"/g, '')}</div>
                          <div className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>#{index + 1}</div>
                          <div className={`text-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            <span className={`px-2 py-1 rounded text-xs ${topic.source === 'user_upload' ? (theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700')}`}>
                              {(() => {
                                const found = sources.find(s => s.value === topic.source);
                                if (found) return found.label;
                                if (topic.source) return topic.source.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                                return '-';
                              })()}
                            </span>
                          </div>
                          <div className={`text-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {(topic.pubDate || topic.createdAt) ? new Date(topic.pubDate || topic.createdAt).toLocaleString('en-US', {
                              timeZone: 'America/New_York',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            }) : '-'}
                          </div>
                        </div>
                        <div className="md:hidden px-4 py-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-medium text-base flex-1">{topic.name.replace(/"/g, '')}</div>
                            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} font-mono`}>#{index + 1}</div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className={`px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                              {topic.searchVolumeRaw.replace(/"/g, '')}
                            </span>
                            <span className={`px-2 py-1 rounded ${topic.source === 'user_upload' ? (theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700')}`}>
                              {(() => {
                                const found = sources.find(s => s.value === topic.source);
                                if (found) return found.label;
                                if (topic.source) return topic.source.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                                return '-';
                              })()}
                            </span>
                          </div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {(topic.pubDate || topic.createdAt) && (
                              <div>
                                <span className="font-medium">Started:</span> {new Date(topic.pubDate || topic.createdAt).toLocaleString('en-US', {
                                  timeZone: 'America/New_York',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
              {topics.length === 0 && !loading && (
                <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  No trending topics found for this source.
                </div>
              )}
            </>
          )}
          {latestPages.length > 0 && (
        <section className="max-w-7xl mx-auto mt-8 mb-0 px-4 md:px-6" aria-labelledby="latest-pages-heading">
          <h2 id="latest-pages-heading" className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Latest
          </h2>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Explore the latest trending topics pages across different categories and sources. Stay informed with real-time updates on what's capturing attention and driving search volume across the internet.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {latestPages.map((page) => {
              const sourceInfo = sources.find(s => s.value === page.source);
              return (
                <a
                  key={page.id}
                  href={page.page_url}
                  className={`group block ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50 border border-gray-200'} rounded-lg overflow-hidden shadow-md transition-all hover:shadow-lg h-full`}
                >
                  <div className="flex flex-row h-full min-h-[180px]">
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
                    <div className="w-3/5 p-4 flex flex-col">
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        {sourceInfo ? sourceInfo.label : page.source} <span className="mx-1">|</span> {new Date(page.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <h3 className={`font-bold text-lg mb-2 ${theme === 'dark' ? 'text-white group-hover:text-blue-400' : 'text-gray-900 group-hover:text-blue-600'} transition-colors line-clamp-2`}>
                        {page.meta_title}
                      </h3>
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

          {topics.length > 0 && (
            <section className="max-w-7xl mx-auto mt-12 mb-0 px-4 md:px-6" aria-labelledby="faq-heading">
              <h2 id="faq-heading" className={`text-2xl md:text-3xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Frequently Asked Questions
              </h2>
              <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Find answers to common questions about {pageData.meta_title.toLowerCase()} and how to use our real-time trending topics platform to discover viral content, analyze search trends, and stay ahead of what's trending online.
              </p>
              <div className="space-y-6">
                <details className={`group ${theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'} rounded-lg`}>
                  <summary className={`cursor-pointer px-6 py-4 font-semibold ${theme === 'dark' ? 'text-white hover:text-blue-400' : 'text-gray-900 hover:text-blue-600'} transition-colors list-none flex items-center justify-between`}>
                    <span>What are the top trending topics for {sourceName}?</span>
                    <span className="ml-2 text-2xl group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <div className={`px-6 pb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <p>
                      The top trending topics for {sourceName} as of {currentDate} are: <strong>{topTopicNames}</strong>.
                      These topics are ranked by search volume and updated in real-time to reflect what people are searching for right now.
                    </p>
                  </div>
                </details>

                <details className={`group ${theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'} rounded-lg`}>
                  <summary className={`cursor-pointer px-6 py-4 font-semibold ${theme === 'dark' ? 'text-white hover:text-blue-400' : 'text-gray-900 hover:text-blue-600'} transition-colors list-none flex items-center justify-between`}>
                    <span>How often is this trending data updated?</span>
                    <span className="ml-2 text-2xl group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <div className={`px-6 pb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <p>
                      Our trending topics data is updated in real-time. The latest update was at{' '}
                      <time dateTime={lastUpdated.toISOString()}>
                        {lastUpdated.toLocaleString('en-US', {
                          timeZone: 'America/New_York',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })} ET
                      </time>.
                      We continuously monitor search trends to bring you the most current information about what's trending.
                    </p>
                  </div>
                </details>

                <details className={`group ${theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'} rounded-lg`}>
                  <summary className={`cursor-pointer px-6 py-4 font-semibold ${theme === 'dark' ? 'text-white hover:text-blue-400' : 'text-gray-900 hover:text-blue-600'} transition-colors list-none flex items-center justify-between`}>
                    <span>What does search volume mean?</span>
                    <span className="ml-2 text-2xl group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <div className={`px-6 pb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <p>
                      Search volume indicates how many times a topic has been searched. Higher search volumes indicate more popular
                      and trending topics that are capturing public attention. We track this metric to help you identify which topics
                      are gaining momentum and becoming viral across the internet.
                    </p>
                  </div>
                </details>

                <details className={`group ${theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'} rounded-lg`}>
                  <summary className={`cursor-pointer px-6 py-4 font-semibold ${theme === 'dark' ? 'text-white hover:text-blue-400' : 'text-gray-900 hover:text-blue-600'} transition-colors list-none flex items-center justify-between`}>
                    <span>How can I use this trending data?</span>
                    <span className="ml-2 text-2xl group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <div className={`px-6 pb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <p>
                      You can use this trending data for content creation, marketing strategies, staying informed about current events,
                      identifying viral topics, and understanding what captures public interest. Our interactive visualization allows you
                      to filter by category and date range to find trends most relevant to your needs.
                    </p>
                  </div>
                </details>

                <details className={`group ${theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'} rounded-lg`}>
                  <summary className={`cursor-pointer px-6 py-4 font-semibold ${theme === 'dark' ? 'text-white hover:text-blue-400' : 'text-gray-900 hover:text-blue-600'} transition-colors list-none flex items-center justify-between`}>
                    <span>Can I switch between bubble and list views?</span>
                    <span className="ml-2 text-2xl group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <div className={`px-6 pb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <p>
                      Yes! Use the view toggle in the filter menu to switch between our interactive bubble chart visualization and
                      a sortable list view. The bubble chart provides a visual representation of trending topics where bubble size
                      represents search volume, while the list view offers detailed sorting and filtering capabilities.
                    </p>
                  </div>
                </details>
              </div>
            </section>
          )}
        </main>
      </div>
      <ComparisonPanel
        topics={topics.filter(t => comparingTopics.has(t.name))}
        theme={theme}
        onClose={() => setComparingTopics(new Set())}
        onRemoveTopic={(topicName) => {
          setComparingTopics(prev => {
            const next = new Set(prev);
            next.delete(topicName);
            return next;
          });
        }}
      />

      <Footer theme={theme} />
    </>
  );
}

export default DynamicPage;
