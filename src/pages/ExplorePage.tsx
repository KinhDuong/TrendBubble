import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Clock, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TrendingTopic } from '../types';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Login from '../components/Login';

export default function ExplorePage() {
  const { isAdmin, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [latestTopics, setLatestTopics] = useState<TrendingTopic[]>([]);
  const [popularTopics, setPopularTopics] = useState<TrendingTopic[]>([]);
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
      const { data, error } = await supabase
        .from('trending_topics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data) {
        const topics = data as TrendingTopic[];

        // Latest topics (most recent)
        setLatestTopics(topics.slice(0, 4));

        // Popular topics (highest search volume)
        const sortedByVolume = [...topics].sort((a, b) => b.searchVolume - a.searchVolume);
        setPopularTopics(sortedByVolume.slice(0, 5));

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
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date: string) => {
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
          onLoginClick={() => setShowLogin(true)}
          onLogout={logout}
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <p className={`mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading topics...</p>
          </div>
        </div>
        <Footer theme={theme} />
        {showLogin && <Login onClose={() => setShowLogin(false)} theme={theme} />}
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <Helmet>
        <title>Explore Topics - Top Best Charts</title>
        <meta name="description" content="Discover the latest trending topics and popular data visualizations across all categories" />
      </Helmet>

      <Header
        theme={theme}
        isAdmin={isAdmin}
        onLoginClick={() => setShowLogin(true)}
        onLogout={logout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Latest Section */}
            <div className="mb-12">
              <div className="relative mb-6">
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} inline-block px-4 py-2 relative`}>
                  <span className="relative z-10">LATEST</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 transform -skew-x-12"></div>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {latestTopics.map((topic, index) => (
                  <Link
                    key={topic.id}
                    to={topic.url || '#'}
                    className={`group block rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ${
                      theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                    } ${index === 0 ? 'md:col-span-2' : ''}`}
                  >
                    <div className={`relative ${index === 0 ? 'h-80' : 'h-48'} bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden`}>
                      <div className="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-20 transition-all duration-300"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <div className="flex items-center gap-2 text-sm mb-2 opacity-90">
                          <span className="uppercase font-semibold">{topic.category}</span>
                          <span>/</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatTimeAgo(topic.createdAt)}
                          </span>
                        </div>
                        <h3 className={`font-bold group-hover:text-blue-300 transition-colors ${index === 0 ? 'text-3xl' : 'text-xl'}`}>
                          {topic.name}
                        </h3>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Search Volume: {formatNumber(topic.searchVolume)}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
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

            {/* Category Sections */}
            {Object.entries(categoryTopics).slice(0, 4).map(([category, topics]) => (
              <div key={category} className="mb-12">
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
            ))}
          </div>

          {/* Sidebar */}
          <div className="lg:w-80">
            {/* Popular Section */}
            <div className={`sticky top-4 rounded-lg p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <div className="relative mb-6">
                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} inline-block px-3 py-1 relative`}>
                  <span className="relative z-10">POPULAR</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 transform -skew-x-12"></div>
                </h2>
              </div>

              <div className="space-y-6">
                {popularTopics.map((topic, index) => (
                  <Link
                    key={topic.id}
                    to={topic.url || '#'}
                    className="block group"
                  >
                    <div className="flex gap-3">
                      <div className={`flex-shrink-0 w-16 h-16 rounded-lg bg-gradient-to-br ${
                        index === 0 ? 'from-yellow-400 to-orange-500' :
                        index === 1 ? 'from-blue-400 to-indigo-500' :
                        index === 2 ? 'from-green-400 to-teal-500' :
                        index === 3 ? 'from-pink-400 to-rose-500' :
                        'from-purple-400 to-violet-500'
                      } flex items-center justify-center`}>
                        <span className="text-white font-bold text-xl">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs mb-1">
                          <span className={`uppercase font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                            {topic.category}
                          </span>
                          <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</span>
                          <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                            {formatTimeAgo(topic.createdAt)}
                          </span>
                        </div>
                        <h3 className={`font-semibold group-hover:text-blue-600 transition-colors line-clamp-2 ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {topic.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          <TrendingUp className="w-3 h-3 text-green-500" />
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {formatNumber(topic.searchVolume)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer theme={theme} />
      {showLogin && <Login onClose={() => setShowLogin(false)} theme={theme} />}
    </div>
  );
}
