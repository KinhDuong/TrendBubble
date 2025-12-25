import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Clock, TrendingUp, Circle, BarChart3, PieChart, Grid3x3, Sparkles, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TrendingTopic } from '../types';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/Header';
import Footer from '../components/Footer';
import UserLogin from '../components/UserLogin';
import ToolSchema from '../components/ToolSchema';

interface FeaturedPage {
  id: string;
  page_url: string;
  meta_title: string;
  meta_description: string;
  source: string;
  display_section?: string;
  created_at: string;
  cover_image?: string;
}

export default function ExplorePage() {
  const { isAdmin, user, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [latestTopics, setLatestTopics] = useState<TrendingTopic[]>([]);
  const [heroPage, setHeroPage] = useState<FeaturedPage | null>(null);
  const [topPages, setTopPages] = useState<FeaturedPage[]>([]);
  const [featuredPages, setFeaturedPages] = useState<FeaturedPage[]>([]);
  const [popularPages, setPopularPages] = useState<FeaturedPage[]>([]);
  const [latestPages, setLatestPages] = useState<FeaturedPage[]>([]);
  const [categoryTopics, setCategoryTopics] = useState<Record<string, TrendingTopic[]>>({});
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';
  });

  useEffect(() => {
    const prerenderFooter = document.getElementById('prerender-footer');
    if (prerenderFooter) {
      prerenderFooter.remove();
    }

    // Remove prerendered meta tags to prevent duplicates with React Helmet
    const prerenderedTags = document.head.querySelectorAll('[data-prerendered]');
    prerenderedTags.forEach(tag => tag.remove());
  }, []);

  useEffect(() => {
    document.documentElement.style.backgroundColor = theme === 'dark' ? '#111827' : '#f1f3f4';
  }, [theme]);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    setLoading(true);
    try {
      const [topicsResponse, heroResponse, topPagesResponse, featuredResponse, popularResponse, latestResponse] = await Promise.all([
        supabase
          .from('trending_topics')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('pages')
          .select('*')
          .eq('display_section', 'hero')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('pages')
          .select('*')
          .eq('display_section', 'top')
          .order('created_at', { ascending: false })
          .limit(2),
        supabase
          .from('pages')
          .select('*')
          .eq('display_section', 'featured')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('pages')
          .select('*')
          .eq('display_section', 'popular')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('pages')
          .select('*')
          .neq('page_url', '/explore')
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (topicsResponse.error) throw topicsResponse.error;

      if (topicsResponse.data) {
        const topics: TrendingTopic[] = topicsResponse.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          searchVolume: item.search_volume || 0,
          searchVolumeRaw: item.search_volume_raw || '',
          url: item.url,
          createdAt: item.created_at || item.pub_date,
          pubDate: item.pub_date,
          category: item.category || 'General',
          source: item.source || 'Unknown',
          crypto_data: item.crypto_data,
        }));

        // Latest topics (most recent)
        setLatestTopics(topics.slice(0, 3));

        // Group by category
        const grouped: Record<string, TrendingTopic[]> = {};
        topics.forEach(topic => {
          const category = topic.category || 'Uncategorized';
          if (!grouped[category]) {
            grouped[category] = [];
          }
          if (grouped[category].length < 3) {
            grouped[category].push(topic);
          }
        });
        setCategoryTopics(grouped);
      }

      setHeroPage(heroResponse.data);
      setTopPages(topPagesResponse.data || []);
      setFeaturedPages(featuredResponse.data || []);
      setPopularPages(popularResponse.data || []);
      setLatestPages(latestResponse.data || []);
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date?: string) => {
    if (!date) return 'Recently';

    const now = new Date();
    const created = new Date(date);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <Header
          theme={theme}
          isAdmin={isAdmin}
          isLoggedIn={!!user}
          onLoginClick={() => setShowLogin(true)}
          onLogout={logout}
          useH1={true}
        />
        <main className="max-w-7xl mx-auto py-8">
          <div className="flex flex-col lg:flex-row gap-8 animate-pulse">
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div className={`rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} md:col-span-2`} style={{ height: '320px' }}></div>
                <div className={`rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`} style={{ height: '240px' }}></div>
                <div className={`rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`} style={{ height: '240px' }}></div>
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-4 mb-8">
                  <div className={`h-8 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} rounded w-48`}></div>
                  {[1, 2, 3].map((j) => (
                    <div key={j} className={`flex gap-4 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                      <div className={`flex-shrink-0 w-32 h-24 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg`}></div>
                      <div className="flex-1 space-y-2">
                        <div className={`h-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-3/4`}></div>
                        <div className={`h-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-1/2`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="lg:w-80 space-y-6">
              <div className={`rounded-lg p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                <div className={`h-6 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-32 mb-6`}></div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 mb-6">
                    <div className={`flex-shrink-0 w-16 h-16 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg`}></div>
                    <div className="flex-1 space-y-2">
                      <div className={`h-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-full`}></div>
                      <div className={`h-3 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-2/3`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
        <Footer theme={theme} />
        {showLogin && <UserLogin onClose={() => setShowLogin(false)} theme={theme} />}
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <Helmet>
        <title>Top Best Charts - Interactive Charts & Top Rankings Made Easy</title>
        <meta name="description" content="Top Best Charts makes exploring rankings simple. Visualize data with Bubble, Bar, Donut, and Treemap charts, see trends at a glance, and uncover insights from the world's top lists" />
      </Helmet>

      <ToolSchema
        name="Top Best Charts - Interactive Data Visualization Tool"
        description="Free interactive tool for visualizing trending topics and search data. Create bubble charts, bar charts, treemaps, and donut charts to explore rankings and insights."
        url={`${import.meta.env.VITE_BASE_URL || 'https://topbestcharts.com'}/`}
        applicationCategory="AnalysisApplication"
        screenshot={[
          `${import.meta.env.VITE_BASE_URL || 'https://topbestcharts.com'}/screenshots/bubble-chart.jpg`,
          `${import.meta.env.VITE_BASE_URL || 'https://topbestcharts.com'}/screenshots/bar-chart.jpg`,
          `${import.meta.env.VITE_BASE_URL || 'https://topbestcharts.com'}/screenshots/treemap.jpg`
        ]}
      />

      <Header
        theme={theme}
        isAdmin={isAdmin}
        isLoggedIn={!!user}
        onLoginClick={() => setShowLogin(true)}
        onLogout={logout}
        useH1={true}
      />

      <main className="max-w-7xl mx-auto py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Top Section */}
            {(heroPage || topPages.length > 0) && (
              <div className="mb-12">
                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  {/* Hero Page */}
                  {heroPage && (
                    <Link
                      to={heroPage.page_url}
                      className={`group block rounded-none md:rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ${
                        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                      } col-span-2`}
                    >
                      <div className="relative h-80 overflow-hidden">
                        {heroPage.cover_image ? (
                          <img src={heroPage.cover_image} alt={heroPage.meta_title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600"></div>
                        )}
                      </div>
                      <div className="p-6">
                        <div className={`flex items-center gap-2 text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span className="uppercase font-semibold">Featured</span>
                          <span>/</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatTimeAgo(heroPage.created_at)}
                          </span>
                        </div>
                        <h3 className={`font-bold text-3xl mb-3 group-hover:text-blue-600 transition-colors ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {heroPage.meta_title}
                        </h3>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
                          {heroPage.meta_description}
                        </p>
                      </div>
                    </Link>
                  )}

                  {/* Top Pages */}
                  {topPages.map((page) => (
                    <Link
                      key={page.id}
                      to={page.page_url}
                      className={`group block rounded-none md:rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ${
                        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                      }`}
                    >
                      <div className="relative h-32 md:h-48 overflow-hidden">
                        {page.cover_image ? (
                          <img src={page.cover_image} alt={page.meta_title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-green-500 to-teal-600"></div>
                        )}
                      </div>
                      <div className="p-3 md:p-4">
                        <div className={`flex items-center gap-1 md:gap-2 text-xs md:text-sm mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span className="uppercase font-semibold">Top</span>
                          <span>/</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatTimeAgo(page.created_at)}
                          </span>
                        </div>
                        <h3 className={`font-bold text-sm md:text-xl mb-2 group-hover:text-blue-600 transition-colors line-clamp-2 ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {page.meta_title}
                        </h3>
                        <p className={`text-xs md:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
                          {page.meta_description}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Latest Pages Section */}
            {latestPages.length > 0 && (
              <div className="mb-12">
                <div className="relative mb-6">
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} inline-block px-4 py-2 relative`}>
                    <span className="relative z-10">LATEST</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 transform -skew-x-12"></div>
                  </h2>
                </div>
                <div className="space-y-4">
                  {latestPages.map((page) => (
                    <Link
                      key={page.id}
                      to={page.page_url}
                      className={`flex gap-4 p-4 rounded-none md:rounded-lg hover:shadow-lg transition-all duration-300 ${
                        theme === 'dark' ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-shrink-0 w-32 h-24 rounded-none md:rounded-lg overflow-hidden">
                        {page.cover_image ? (
                          <img src={page.cover_image} alt={page.meta_title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-cyan-500"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-xs mb-2">
                          <span className={`uppercase font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                            Page
                          </span>
                          <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</span>
                          <span className={`flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(page.created_at)}
                          </span>
                        </div>
                        <h3 className={`font-bold text-lg mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {page.meta_title}
                        </h3>
                        {page.meta_description && (
                          <p className={`text-sm line-clamp-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {page.meta_description}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* View All Topics CTA Section */}
            <div className="mb-12">
              <Link
                to="/browse-topics/"
                className={`group relative block overflow-hidden rounded-none md:rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 ${
                  theme === 'dark' ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-blue-50 via-white to-cyan-50'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 opacity-10 group-hover:opacity-20 transition-opacity duration-500"></div>
                <div className="relative p-8 md:p-12 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                    <BookOpen className="w-10 h-10 text-white" />
                  </div>
                  <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Explore All Topics
                  </h2>
                  <p className={`text-lg md:text-xl mb-6 max-w-2xl mx-auto ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Browse our complete collection organized by category. Discover rankings, insights, and trends across all topics.
                  </p>
                  <div className={`inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 ${
                    theme === 'dark'
                      ? 'bg-blue-600 text-white group-hover:bg-blue-500'
                      : 'bg-blue-600 text-white group-hover:bg-blue-700'
                  } shadow-lg group-hover:shadow-xl group-hover:scale-105`}>
                    <span>View All Topics</span>
                    <TrendingUp className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
              </Link>
            </div>

            {/* Category Sections */}
            {Object.entries(categoryTopics).slice(0, 3).map(([category, topics], index) => (
              <div key={category}>
                <div className="mb-12">
                  <h2 className={`text-xl font-bold mb-4 uppercase ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {category}
                  </h2>
                  <div className="space-y-4">
                    {topics.map((topic) => (
                      <Link
                        key={topic.id}
                        to={topic.url || '#'}
                        className={`flex gap-4 p-4 rounded-lg hover:shadow-lg transition-all duration-300 ${
                          theme === 'dark' ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex-shrink-0 w-32 h-24 bg-gradient-to-br from-pink-400 to-purple-500 rounded-lg"></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-xs mb-2">
                            <span className={`uppercase font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                              {category}
                            </span>
                            <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</span>
                            <span className={`flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(topic.createdAt)}
                            </span>
                          </div>
                          <h3 className={`font-bold text-lg mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {topic.name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm">
                            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                              {formatNumber(topic.searchVolume)} searches
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                            }`}>
                              {topic.source}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 space-y-6">
            {/* Featured Section */}
            {featuredPages.length > 0 && (
              <div className={`sticky top-4 rounded-lg p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <div className="relative mb-6">
                  <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} inline-block px-3 py-1 relative`}>
                    <span className="relative z-10">FEATURED</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 transform -skew-x-12"></div>
                  </h2>
                </div>

                <div className="space-y-6">
                  {featuredPages.map((page, index) => (
                    <Link
                      key={page.id}
                      to={page.page_url}
                      className="block group"
                    >
                      <div className="flex gap-3">
                        <div className={`flex-shrink-0 w-16 h-16 rounded-none md:rounded-lg overflow-hidden relative ${
                          !page.cover_image ? 'flex items-center justify-center' : ''
                        }`}>
                          {page.cover_image ? (
                            <>
                              <img src={page.cover_image} alt={page.meta_title} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                                <span className="text-white font-bold text-xl">{index + 1}</span>
                              </div>
                            </>
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${
                              index === 0 ? 'from-yellow-400 to-orange-500' :
                              index === 1 ? 'from-blue-400 to-cyan-500' :
                              index === 2 ? 'from-green-400 to-teal-500' :
                              index === 3 ? 'from-pink-400 to-rose-500' :
                              'from-orange-400 to-red-500'
                            } flex items-center justify-center`}>
                              <span className="text-white font-bold text-xl">{index + 1}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs mb-1">
                            <span className={`uppercase font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                              Featured
                            </span>
                            <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</span>
                            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                              {formatTimeAgo(page.created_at)}
                            </span>
                          </div>
                          <h3 className={`font-semibold group-hover:text-blue-600 transition-colors line-clamp-2 ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {page.meta_title}
                          </h3>
                          {page.meta_description && (
                            <p className={`text-xs mt-1 line-clamp-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {page.meta_description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Section */}
            {popularPages.length > 0 && (
              <div className={`rounded-none md:rounded-lg p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <div className="relative mb-6">
                  <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} inline-block px-3 py-1 relative`}>
                    <span className="relative z-10">POPULAR</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-red-500 transform -skew-x-12"></div>
                  </h2>
                </div>

                <div className="space-y-6">
                  {popularPages.map((page, index) => (
                    <Link
                      key={page.id}
                      to={page.page_url}
                      className="block group"
                    >
                      <div className="flex gap-3">
                        <div className={`flex-shrink-0 w-16 h-16 rounded-none md:rounded-lg overflow-hidden relative ${
                          !page.cover_image ? 'flex items-center justify-center' : ''
                        }`}>
                          {page.cover_image ? (
                            <>
                              <img src={page.cover_image} alt={page.meta_title} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                                <span className="text-white font-bold text-xl">{index + 1}</span>
                              </div>
                            </>
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${
                              index === 0 ? 'from-pink-400 to-rose-500' :
                              index === 1 ? 'from-red-400 to-orange-500' :
                              index === 2 ? 'from-purple-400 to-pink-500' :
                              index === 3 ? 'from-orange-400 to-yellow-500' :
                              'from-rose-400 to-pink-500'
                            } flex items-center justify-center`}>
                              <span className="text-white font-bold text-xl">{index + 1}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold group-hover:text-pink-600 transition-colors line-clamp-2 ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {page.meta_title}
                          </h3>
                          {page.meta_description && (
                            <p className={`text-xs mt-1 line-clamp-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {page.meta_description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* What Is Top Best Charts Section */}
        <div className="max-w-7xl mx-auto py-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className={`w-8 h-8 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                What Is Top Best Charts?
              </h2>
              <Sparkles className={`w-8 h-8 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <p className={`text-lg max-w-3xl mx-auto ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Your Ultimate Data Visualization Hub
            </p>
            <p className={`mt-4 max-w-4xl mx-auto ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Top Best Charts helps you explore the world's top-ranked items quickly and visually. From rankings to insights,
              our platform makes data easy to understand and engaging for everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Top List Card */}
            <div className={`group p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ${
              theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-white to-gray-50'
            }`}>
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Top List Rankings
              </h3>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Browse the most popular items ranked by popularity, trends, and user engagement. Stay updated with what's trending now.
              </p>
            </div>

            {/* Bubble Chart Card */}
            <div className={`group p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ${
              theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-white to-gray-50'
            }`}>
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                <Circle className="w-8 h-8 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Bubble Chart Analysis
              </h3>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Analyze trends with interactive bubble charts that reveal relationships between data points at a glance.
              </p>
            </div>

            {/* Bar Chart Card */}
            <div className={`group p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ${
              theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-white to-gray-50'
            }`}>
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Bar Chart Comparisons
              </h3>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Compare values side-by-side with clear bar charts that make differences and patterns easy to spot.
              </p>
            </div>

            {/* Donut Chart Card */}
            <div className={`group p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ${
              theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-white to-gray-50'
            }`}>
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                <PieChart className="w-8 h-8 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Donut Chart Proportions
              </h3>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Explore proportions and distributions with elegant donut charts that highlight key segments.
              </p>
            </div>

            {/* Treemap Card */}
            <div className={`group p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ${
              theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-white to-gray-50'
            }`}>
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                <Grid3x3 className="w-8 h-8 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Treemap Layout
              </h3>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Understand hierarchical data with structured treemap layouts showing relationships and impact clearly.
              </p>
            </div>

            {/* Who It's For Card */}
            <div className={`group p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ${
              theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-white to-gray-50'
            }`}>
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                For Everyone
              </h3>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Perfect for researchers, marketers, and enthusiasts. Your go-to destination for fast, intuitive, and visually stunning data exploration.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer theme={theme} />
      {showLogin && <UserLogin onClose={() => setShowLogin(false)} theme={theme} />}
    </div>
  );
}
