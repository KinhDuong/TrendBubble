import { TrendingUp, LogIn } from 'lucide-react';

interface HeaderProps {
  theme: 'dark' | 'light';
  isAdmin: boolean;
  onLoginClick: () => void;
  title?: string;
}

export default function Header({ theme, isAdmin, onLoginClick, title = 'Google Trending Topics - Real-Time Search Trends' }: HeaderProps) {
  return (
    <header className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
      <div className="px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 flex-shrink-0 rounded-full shadow-lg border-4 border-gray-900 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-300 via-blue-400 to-blue-500"></div>
              <div className="absolute inset-0 bg-gradient-to-tl from-blue-400 via-blue-500 to-blue-600 opacity-60"></div>
              <TrendingUp size={24} className="text-white relative z-10" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white">{title}</h1>
          </div>
          {!isAdmin && (
            <button
              onClick={onLoginClick}
              className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
              title="Admin Login"
              aria-label="Admin Login"
            >
              <LogIn size={24} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
