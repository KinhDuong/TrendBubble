import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import DataManager from '../components/DataManager';
import SourceManager from '../components/SourceManager';
import { useAuth } from '../hooks/useAuth';
import Login from '../components/Login';
import { Database, Tag } from 'lucide-react';

export default function AdminData() {
  const { isAdmin, user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'dark';
  });
  const [showLogin, setShowLogin] = useState(false);
  const [activeTab, setActiveTab] = useState<'data' | 'sources'>('data');

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!isAdmin) {
      setShowLogin(true);
    } else {
      setShowLogin(false);
    }
  }, [isAdmin, authLoading]);

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleLogin = () => {
    setShowLogin(false);
    window.location.reload();
  };

  if (authLoading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Header
          theme={theme}
          isAdmin={isAdmin}
          isLoggedIn={!!user}
          onThemeChange={handleThemeChange}
          onLoginClick={() => {}}
          onLogout={logout}
        />
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin && showLogin) {
    return <Login onClose={handleLogin} theme={theme} />;
  }

  if (!isAdmin) {
    navigate('/');
    return null;
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header
        theme={theme}
        isAdmin={isAdmin}
        isLoggedIn={!!user}
        onLoginClick={() => setShowLogin(true)}
        onLogout={logout}
        title="Data Manager"
      />

      <div className={`max-w-7xl mx-auto px-4 py-8`}>
        <div className="mb-6">
          <div className="flex items-center gap-2 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('data')}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'data'
                  ? theme === 'dark'
                    ? 'border-b-2 border-blue-500 text-blue-400'
                    : 'border-b-2 border-blue-600 text-blue-600'
                  : theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-300'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Database size={18} />
              Data Manager
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'sources'
                  ? theme === 'dark'
                    ? 'border-b-2 border-blue-500 text-blue-400'
                    : 'border-b-2 border-blue-600 text-blue-600'
                  : theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-300'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Tag size={18} />
              Source Manager
            </button>
          </div>
        </div>

        {activeTab === 'data' ? (
          <DataManager theme={theme} initialSource={searchParams.get('source') || undefined} />
        ) : (
          <SourceManager theme={theme} />
        )}
      </div>

      <Footer theme={theme} />
    </div>
  );
}
