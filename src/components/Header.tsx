import { Menu, X, Home, Compass, Mail, Info, LogIn, LogOut, Search } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import Logo from './Logo';

interface HeaderProps {
  theme: 'dark' | 'light';
  isAdmin: boolean;
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

export default function Header({ theme, isAdmin, onLoginClick, onLogout, title = 'Top Best Charts', useH1 = false, snapshotButton }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Page[]>([]);
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
    const searchPages = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('pages')
          .select('*')
          .or(`meta_title.ilike.%${searchQuery}%,meta_description.ilike.%${searchQuery}%,page_url.ilike.%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error('Error searching pages:', error);
        setSearchResults([]);
      }
    };

    const debounceTimer = setTimeout(searchPages, 300);
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
              <Logo size={28} className="text-blue-600 relative z-10" />
            </div>
            <div className="flex items-center gap-3">
              {useH1 ? (
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-blue-600" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</h1>
              ) : (
                <div className="text-xl md:text-2xl font-bold tracking-tight text-blue-600" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</div>
              )}
              {snapshotButton}
            </div>
          </a>

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
                  {searchResults.map((page) => (
                    <a
                      key={page.id}
                      href={page.page_url}
                      onClick={handleSearchResultClick}
                      className={`block px-4 py-3 ${theme === 'dark' ? 'hover:bg-gray-700 border-gray-700' : 'hover:bg-gray-50 border-gray-200'} border-b last:border-b-0 transition-colors`}
                    >
                      <div className={`font-semibold text-sm mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                        {page.meta_title}
                      </div>
                      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
                        {page.meta_description}
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {isSearchOpen && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className={`absolute top-full right-0 mt-2 w-72 md:w-96 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-600'} border rounded-lg shadow-lg z-50 px-4 py-3 text-sm`}>
                  No pages found
                </div>
              )}
            </div>

            <div className="relative">
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
                      href="/"
                      className={`flex items-center gap-3 px-6 py-3 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'} transition-colors`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Compass size={20} />
                      <span>Explore Topics</span>
                    </a>
                    <a
                      href="mailto:contact@example.com"
                      className={`flex items-center gap-3 px-6 py-3 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'} transition-colors`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Mail size={20} />
                      <span>Contact</span>
                    </a>
                    <a
                      href="#about"
                      className={`flex items-center gap-3 px-6 py-3 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'} transition-colors`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Info size={20} />
                      <span>About</span>
                    </a>
                    <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} my-2`}></div>
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
