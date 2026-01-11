import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export function useAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [membershipTier, setMembershipTier] = useState<number>(1);

  useEffect(() => {
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        (async () => {
          await checkAuth();
        })();
      } else if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setUser(null);
        setMembershipTier(1);
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
        setUser(null);
        setMembershipTier(1);
        setIsLoading(false);
        return;
      }

      setUser(user);

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, membership_tier')
        .eq('id', user.id)
        .maybeSingle();

      if (!profileError && !profileData) {
        let username = user.email?.split('@')[0] || `user${user.id.substring(0, 8)}`;
        const displayName = user.user_metadata?.name || username;

        const { data: existingUsername } = await supabase
          .from('user_profiles')
          .select('username')
          .eq('username', username)
          .maybeSingle();

        if (existingUsername) {
          username = `${username}_${user.id.substring(0, 8)}`;
        }

        await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            username: username,
            display_name: displayName
          });

        setMembershipTier(1);
      } else if (profileData) {
        setMembershipTier(profileData.membership_tier || 1);
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
      setUser(null);
      setMembershipTier(1);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setUser(null);
    setMembershipTier(1);
  };

  const getKeywordLimit = (tier: number = membershipTier): number => {
    switch (tier) {
      case 1: return 200;
      case 2: return 500;
      case 3: return 1000;
      case 4: return -1;
      case 5: return -1;
      default: return 200;
    }
  };

  return { isAdmin, isLoading, user, logout, membershipTier, getKeywordLimit };
}
