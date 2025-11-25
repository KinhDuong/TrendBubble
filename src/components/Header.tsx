import { TrendingUp, Menu, X, Home, Compass, Mail, Info, LogIn, LogOut } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  theme: 'dark' | 'light';
  isAdmin: boolean;
  onLoginClick: () => void;
  onLogout?: () => void;
  title?: string;
}

export default function Header({ theme, isAdmin, onLoginClick, onLogout, title = 'Trending Bubbles' }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  return (
    <header className={`${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-200 shadow-sm'} border-b relative`}>
      <div className="px-2 md:px-3 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className={`relative w-12 h-12 flex-shrink-0 rounded-full shadow-lg border-4 border-blue-600 overflow-hidden flex items-center justify-center ${theme === 'dark' ? 'bg-transparent' : 'bg-transparent'}`}>
              <TrendingUp size={24} strokeWidth={4} className="text-blue-600 relative z-10" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-blue-600" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</h1>
          </a>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
            aria-label="Menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={24} className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} /> : <Menu size={24} className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className={`absolute top-full right-2 md:right-3 w-64 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-l border-b shadow-lg z-50`}>
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
    </header>
  );
}
