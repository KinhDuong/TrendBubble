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
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'dark';
  });
  const [showLogin, setShowLogin] = useState(!isAdmin);
  const [activeTab, setActiveTab] = useState<'data' | 'sources'>('data');

  useEffect(() => {
    if (!isAdmin) {
      setShowLogin(true);
    } else {
      setShowLogin(false);
    }
  }, [isAdmin]);

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleLogin = () => {
    setShowLogin(false);
    window.location.reload();
  };

  if (!isAdmin && showLogin) {
    return <Login onLogin={handleLogin} theme={theme} />;
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
