import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PageManager from '../components/PageManager';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import Login from '../components/Login';

export default function AdminPages() {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showLogin, setShowLogin] = useState(!isAdmin);

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setShowLogin(true);
    } else {
      setShowLogin(false);
    }
  }, [isAdmin]);

  const loadThemePreference = async () => {
    try {
      const { data } = await supabase
        .from('user_preferences')
        .select('theme')
        .maybeSingle();

      if (data?.theme) {
        setTheme(data.theme as 'dark' | 'light');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const saveThemePreference = async (newTheme: 'dark' | 'light') => {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ id: 1, theme: newTheme });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    saveThemePreference(newTheme);
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
        title="Page Manager"
      />

      <div className={`max-w-7xl mx-auto px-4 py-8`}>
        <PageManager theme={theme} />
      </div>

      <Footer theme={theme} />
    </div>
  );
}
