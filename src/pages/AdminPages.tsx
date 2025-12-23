import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PageManager from '../components/PageManager';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import Login from '../components/Login';

export default function AdminPages() {
  const { isAdmin, user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'dark';
  });
  const [showLogin, setShowLogin] = useState(false);

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
        title="Page Manager"
      />

      <div className={`max-w-7xl mx-auto px-4 py-8`}>
        <PageManager theme={theme} />
      </div>

      <Footer theme={theme} />
    </div>
  );
}
