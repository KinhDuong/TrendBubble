import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        (async () => {
          await checkAuth();
        })();
      } else if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setIsLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      setIsAdmin(!!adminData);
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return { isAdmin, isLoading, logout };
}
