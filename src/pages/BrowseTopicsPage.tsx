import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Clock, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ToolSchema from '../components/ToolSchema';
import Login from '../components/Login';

interface Page {
  id: string;
  page_url: string;
  meta_title: string;
  meta_description: string;
  created_at: string;
  cover_image?: string;
  category?: string;
}

interface CategoryGroup {
  category: string;
  pages: Page[];
}

export default function BrowseTopicsPage() {
  const { isAdmin, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
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

    const prerenderedTags = document.head.querySelectorAll('[data-prerendered]');
    prerenderedTags.forEach(tag => tag.remove());
  }, []);

  useEffect(() => {
    document.documentElement.style.backgroundColor = theme === 'dark' ? '#111827' : '#f1f3f4';
  }, [theme]);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .not('category', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const grouped: Record<string, Page[]> = {};

        data.forEach((page: Page) => {
          const category = page.category || 'Uncategorized';
          if (!grouped[category]) {
            grouped[category] = [];
          }
          grouped[category].push(page);
        });

        const categoryArray: CategoryGroup[] = Object.entries(grouped)
          .map(([category, pages]) => ({
            category,
            pages
          }))
          .sort((a, b) => a.category.localeCompare(b.category));

        setCategoryGroups(categoryArray);
      }
    } catch (error) {
      console.error('Error loading pages:', error);
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

  const getCategoryColor = (category: string, index: number) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-purple-500 to-purple-600',
      'from-orange-500 to-orange-600',
      'from-pink-500 to-pink-600',
      'from-teal-500 to-teal-600',
      'from-red-500 to-red-600',
      'from-cyan-500 to-cyan-600',
      'from-yellow-500 to-yellow-600',
      'from-indigo-500 to-indigo-600',
    ];
    return colors[index % colors.length];
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
        <main className="max-w-7xl mx-auto py-8 px-4">
          <div className="animate-pulse space-y-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <div className={`h-10 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} rounded w-48`}></div>
                <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6">
                  {[1, 2, 3].map((j) => (
                    <div key={j}>
                      {/* Mobile skeleton */}
                      <div className={`flex gap-4 p-4 rounded-none md:hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                        <div className={`flex-shrink-0 w-32 h-24 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg`}></div>
                        <div className="flex-1 space-y-2">
                          <div className={`h-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-3/4`}></div>
                          <div className={`h-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-1/2`}></div>
                        </div>
                      </div>
                      {/* Desktop skeleton */}
                      <div className={`hidden md:block rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-4`}>
                        <div className={`h-48 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-4`}></div>
                        <div className={`h-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-3/4 mb-2`}></div>
                        <div className={`h-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-1/2`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
        <Footer theme={theme} />
        {showLogin && <Login onClose={() => setShowLogin(false)} theme={theme} />}
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <Helmet>
        <title>Browse Topics - Top Best Charts</title>
        <meta name="description" content="Browse all topics and categories on Top Best Charts. Explore rankings, trends, and insights across various categories including AI, Markets, Technology, and more." />
      </Helmet>

      <ToolSchema
        name="Browse Topics - Top Best Charts"
        description="Browse all topics and categories on Top Best Charts. Explore rankings, trends, and insights across various categories including AI, Markets, Technology, and more."
        url={`${import.meta.env.VITE_BASE_URL || 'https://topbestcharts.com'}/browse-topics`}
        applicationCategory="AnalysisApplication"
      />

      <Header
        theme={theme}
        isAdmin={isAdmin}
        onLoginClick={() => setShowLogin(true)}
        onLogout={logout}
      />

      <main className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <BookOpen className={`w-10 h-10 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            <h1 className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Browse Topics
            </h1>
          </div>
          <p className={`text-lg max-w-3xl mx-auto ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Explore our collection of topics organized by category
          </p>
        </div>

        {categoryGroups.length === 0 ? (
          <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <p>No topics available yet.</p>
          </div>
        ) : (
          <div className="space-y-16">
            {categoryGroups.map((group, index) => (
              <div key={group.category}>
                <div className="relative mb-6">
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} inline-block px-4 py-2 relative`}>
                    <span className="relative z-10">{group.category}</span>
                    <div className={`absolute inset-0 bg-gradient-to-r ${getCategoryColor(group.category, index)} transform -skew-x-12`}></div>
                  </h2>
                </div>

                <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6">
                  {group.pages.map((page) => (
                    <Link
                      key={page.id}
                      to={page.page_url}
                      className={`group block rounded-lg md:rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ${
                        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                      }`}
                    >
                      {/* Mobile: Horizontal card layout */}
                      <div className="flex gap-4 p-4 md:hidden">
                        <div className="flex-shrink-0 w-32 h-24 rounded-none md:rounded-lg overflow-hidden">
                          {page.cover_image ? (
                            <img
                              src={page.cover_image}
                              alt={page.meta_title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${getCategoryColor(group.category, index)}`}></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`flex items-center gap-2 text-xs mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            <span className="uppercase font-semibold">{group.category}</span>
                            <span>/</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(page.created_at)}
                            </span>
                          </div>
                          <h3 className={`font-bold text-base mb-2 group-hover:text-blue-600 transition-colors line-clamp-2 ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {page.meta_title}
                          </h3>
                          {page.meta_description && (
                            <p className={`text-sm line-clamp-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {page.meta_description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Desktop: Vertical card layout */}
                      <div className="hidden md:block">
                        <div className="relative h-48 overflow-hidden">
                          {page.cover_image ? (
                            <img
                              src={page.cover_image}
                              alt={page.meta_title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${getCategoryColor(group.category, index)}`}></div>
                          )}
                        </div>
                        <div className="p-4">
                          <div className={`flex items-center gap-2 text-xs mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            <span className="uppercase font-semibold">{group.category}</span>
                            <span>/</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(page.created_at)}
                            </span>
                          </div>
                          <h3 className={`font-bold text-lg mb-2 group-hover:text-blue-600 transition-colors line-clamp-2 ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {page.meta_title}
                          </h3>
                          {page.meta_description && (
                            <p className={`text-sm line-clamp-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {page.meta_description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer theme={theme} />
      {showLogin && <Login onClose={() => setShowLogin(false)} theme={theme} />}
    </div>
  );
}
