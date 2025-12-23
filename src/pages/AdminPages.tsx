import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PageManager from '../components/PageManager';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import Login from '../components/Login';

export default function AdminPages() {
  const { isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'dark';
  });
  const [showLogin, setShowLogin] = useState(!isAdmin);

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
