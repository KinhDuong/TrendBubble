import { BarChart3, Menu, X, Home, Compass, BookOpen, Mail, Info, LogIn, LogOut, Search, Upload, User } from 'lucide-react';
import { useState, useEffect, useRef, memo } from 'react';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  theme: 'dark' | 'light';
  isAdmin: boolean;
  isLoggedIn?: boolean;
  onLoginClick: () => void;
  onLogout?: () => void;
  title?: string;
  useH1?: boolean;
  snapshotButton?: React.ReactNode;
}

interface Page {
  id: string;
  page_url: string;
  meta_title: string;
  meta_description: string;
  source: string;
}

interface BrandPage {
  id: string;
  brand: string;
  meta_title: string;
  meta_description: string;
  page_id: string;
  category?: string;
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  type: 'page' | 'brand';
  source: string;
}

const TITLE_STYLE = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontWeight: 700,
  letterSpacing: '-0.02em'
} as const;

function Header({ theme, isAdmin, isLoggedIn = false, onLoginClick, onLogout, title = 'Top Best Charts', useH1 = false, snapshotButton }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setIsSearchExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchAll = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        // Execute both queries in parallel
        const [pagesResult, brandPagesResult] = await Promise.all([
          supabase
            .from('pages')
            .select('*')
            .or(`meta_title.ilike.%${searchQuery}%,meta_description.ilike.%${searchQuery}%,page_url.ilike.%${searchQuery}%`)
            .limit(6),
          supabase
            .from('brand_pages')
            .select('id, brand, meta_title, meta_description, page_id, user_id')
            .eq('is_public', true)
            .or(`brand.ilike.%${searchQuery}%,meta_title.ilike.%${searchQuery}%,meta_description.ilike.%${searchQuery}%`)
            .limit(6)
        ]);

        if (pagesResult.error) throw pagesResult.error;
        if (brandPagesResult.error) throw brandPagesResult.error;

        // Fetch usernames for brand pages
        let brandPagesWithUsernames: any[] = [];
        if (brandPagesResult.data && brandPagesResult.data.length > 0) {
          const userIds = brandPagesResult.data.map(bp => bp.user_id);
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('id, username')
            .in('id', userIds);

          const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
          brandPagesWithUsernames = brandPagesResult.data.map(bp => ({
            ...bp,
            username: profileMap.get(bp.user_id) || ''
          }));
        }

        // Transform pages to search results
        const pageResults: SearchResult[] = (pagesResult.data || []).map(page => ({
          id: `page-${page.id}`,
          title: page.meta_title,
          description: page.meta_description || '',
          url: page.page_url,
          type: 'page' as const,
          source: page.source
        }));

        // Transform brand pages to search results
        const brandResults: SearchResult[] = brandPagesWithUsernames.map((brandPage: any) => ({
          id: `brand-${brandPage.id}`,
          title: brandPage.meta_title,
          description: brandPage.meta_description || '',
          url: `/insights/${brandPage.username}/${brandPage.page_id}/`,
          type: 'brand' as const,
          source: brandPage.brand
        }));

        // Combine and limit to 10 total results
        const combinedResults = [...pageResults, ...brandResults].slice(0, 10);
        setSearchResults(combinedResults);
      } catch (error) {
        console.error('Error searching:', error);
        setSearchResults([]);
      }
    };

    const debounceTimer = setTimeout(searchAll, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleLogout = () => {
    setIsMenuOpen(false);
    if (onLogout) {
      onLogout();
    }
  };

  const handleLogin = () => {
    setIsMenuOpen(false);
    onLoginClick();
  };

  const handleSearchResultClick = () => {
    setIsSearchOpen(false);
    setIsSearchExpanded(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSearchIconClick = () => {
    setIsSearchExpanded(true);
  };

  return (
    <header className={`${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-200 shadow-sm'} border-b`}>
      <div className="px-2 md:px-3 py-2 relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo and Title - Hide on mobile when search is expanded */}
          <a
            href="/"
            className={`flex items-center gap-3 hover:opacity-80 transition-opacity ${isSearchExpanded ? 'hidden md:flex' : 'flex'}`}
          >
            <div className={`relative w-12 h-12 flex-shrink-0 rounded-full shadow-lg border-4 border-blue-600 overflow-hidden flex items-center justify-center ${theme === 'dark' ? 'bg-transparent' : 'bg-transparent'}`}>
              <BarChart3 size={24} strokeWidth={4} className="text-blue-600 relative z-10" />
            </div>
            <div className="flex items-center gap-3">
              {useH1 ? (
                <h1 className="text-lg md:text-2xl font-bold tracking-tight text-blue-600" style={TITLE_STYLE}>{title}</h1>
              ) : (
                <div className="text-lg md:text-2xl font-bold tracking-tight text-blue-600" style={TITLE_STYLE}>{title}</div>
              )}
              {snapshotButton}
            </div>
          </a>

          {/* Desktop Navigation - Always visible on desktop for SEO */}
          <nav className="hidden lg:flex items-center gap-6" aria-label="Main navigation">
            <a
              href="/trending-now/"
              className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}
            >
              Trending Now
            </a>
            <a
              href="/browse-topics/"
              className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}
            >
              Browse Topics
            </a>
            <a
              href="/upload/"
              className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}
            >
              Create My Charts
            </a>
            {isLoggedIn && (
              <a
                href="/insights-meta/"
                className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}
              >
                Brand Insight
              </a>
            )}
            <a
              href="/contact/"
              className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}
            >
              Contact
            </a>
            {isLoggedIn ? (
              <a
                href="/profile/"
                className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
                title="User Profile"
              >
                <User size={20} className="text-white" />
              </a>
            ) : (
              <button
                onClick={handleLogin}
                className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}
              >
                Login
              </button>
            )}
          </nav>

          <div className={`flex items-center gap-2 ${isSearchExpanded ? 'flex-1 md:flex-none' : ''}`}>
            <div className={`relative ${isSearchExpanded ? 'flex-1 md:flex-none' : ''}`} ref={searchRef}>
              {/* Mobile: Show icon only when not expanded */}
              {!isSearchExpanded && (
                <button
                  onClick={handleSearchIconClick}
                  className={`md:hidden p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
                  aria-label="Search"
                >
                  <Search size={20} className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} />
                </button>
              )}

              {/* Mobile: Expanded search input - inline, not absolute */}
              {isSearchExpanded && (
                <div className={`md:hidden flex items-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                  <Search size={18} className={`ml-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchOpen(true)}
                    autoFocus
                    className={`px-3 py-2 flex-1 ${theme === 'dark' ? 'bg-gray-800 text-gray-200 placeholder-gray-500' : 'bg-white text-gray-900 placeholder-gray-400'} rounded-lg focus:outline-none`}
                  />
                </div>
              )}

              {/* Desktop: Always show full search input */}
              <div className={`hidden md:flex items-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                <Search size={18} className={`ml-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchOpen(true)}
                  className={`px-3 py-2 w-48 ${theme === 'dark' ? 'bg-gray-800 text-gray-200 placeholder-gray-500' : 'bg-white text-gray-900 placeholder-gray-400'} rounded-lg focus:outline-none`}
                />
              </div>

              {isSearchOpen && searchResults.length > 0 && (
                <div className={`absolute top-full right-0 mt-2 w-72 md:w-96 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto`}>
                  {searchResults.map((result) => (
                    <a
                      key={result.id}
                      href={result.url}
                      onClick={handleSearchResultClick}
                      className={`block px-4 py-3 ${theme === 'dark' ? 'hover:bg-gray-700 border-gray-700' : 'hover:bg-gray-50 border-gray-200'} border-b last:border-b-0 transition-colors`}
                    >
                      <div className="flex items-start gap-2 mb-1">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            result.type === 'brand'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {result.type === 'brand' ? 'Brand' : 'Page'}
                        </span>
                        <div className={`font-semibold text-sm flex-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                          {result.title}
                        </div>
                      </div>
                      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
                        {result.description}
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {isSearchOpen && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className={`absolute top-full right-0 mt-2 w-72 md:w-96 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-600'} border rounded-lg shadow-lg z-50 px-4 py-3 text-sm`}>
                  No results found
                </div>
              )}
            </div>

            {/* Mobile Menu Button - Only show on mobile/tablet */}
            <div className="relative lg:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
                aria-label="Menu"
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? <X size={24} className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} /> : <Menu size={24} className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} />}
              </button>

              {isMenuOpen && (
                <div className={`absolute top-full right-0 mt-2 w-64 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg z-50`}>
                  <nav className="py-2">
                    <a
                      href="/"
                      className={`flex items-center gap-3 px-6 py-3 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'} transition-colors`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Home size={20} />
                      <span>Home</span>
                    </a>
                    <a
                      href="/trending-now/"
                      className={`flex items-center gap-3 px-6 py-3 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'} transition-colors`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Compass size={20} />
                      <span>Trending Now</span>
                    </a>
                    <a
                      href="/browse-topics/"
                      className={`flex items-center gap-3 px-6 py-3 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'} transition-colors`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <BookOpen size={20} />
                      <span>Browse Topics</span>
                    </a>
                    <a
                      href="/upload/"
                      className={`flex items-center gap-3 px-6 py-3 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'} transition-colors`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Upload size={20} />
                      <span>Create My Charts</span>
                    </a>
                    {isLoggedIn && (
                      <a
                        href="/insights-meta/"
                        className={`flex items-center gap-3 px-6 py-3 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'} transition-colors`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <BarChart3 size={20} />
                        <span>Brand Insight</span>
                      </a>
                    )}
                    <a
                      href="/contact/"
                      className={`flex items-center gap-3 px-6 py-3 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'} transition-colors`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Mail size={20} />
                      <span>Contact</span>
                    </a>
                    <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} my-2`}></div>
                    <a
                      href="/profile/"
                      className={`flex items-center gap-3 px-6 py-3 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'} transition-colors`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User size={20} />
                      <span>User Profile</span>
                    </a>
                    {isAdmin ? (
                      <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 px-6 py-3 w-full text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'} transition-colors`}
                      >
                        <LogOut size={20} />
                        <span>Logout</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleLogin}
                        className={`flex items-center gap-3 px-6 py-3 w-full text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'} transition-colors`}
                      >
                        <LogIn size={20} />
                        <span>Login</span>
                      </button>
                    )}
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default memo(Header);
