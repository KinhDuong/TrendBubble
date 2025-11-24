import { TrendingUp, Menu, X, Home, Compass, Mail, Info, LogIn, LogOut } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  theme: 'dark' | 'light';
  isAdmin: boolean;
  onLoginClick: () => void;
  onLogout?: () => void;
  title?: string;
}

export default function Header({ theme, isAdmin, onLoginClick, onLogout, title = 'Google Trending Topics - Real-Time Search Trends' }: HeaderProps) {
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
    <header className={`${theme === 'dark' ? 'border-gray-700' : 'border-gray-200 shadow-sm'} border-b relative`} style={{ backgroundColor: theme === 'dark' ? '#1e1e21' : '#f1f3f4' }}>
      <div className="px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="relative w-12 h-12 flex-shrink-0 rounded-full shadow-lg border-4 border-gray-900 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600"></div>
              <TrendingUp size={24} strokeWidth={4} className="text-white relative z-10" />
            </div>
            <h1 className={`text-xl md:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
          </a>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors"
            aria-label="Menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className={`absolute top-full right-0 w-64 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-l border-b shadow-lg z-50`}>
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
