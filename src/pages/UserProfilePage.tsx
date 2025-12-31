import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { User as UserIcon, Mail, Calendar, LogOut, LogIn as LoginIcon, Users, Award, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import Login from '../components/Login';
import { supabase } from '../lib/supabase';

interface UserProfile {
  username: string;
  display_name: string;
}

export default function UserProfilePage() {
  const { isAdmin, user, logout, isLoading, membershipTier, getKeywordLimit } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setShowLogin(true);
  };

  const handleLoginClose = () => {
    setShowLogin(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Helmet>
          <title>User Profile - Top Best Charts</title>
          <meta name="description" content="Manage your user profile and account settings" />
        </Helmet>

        <Header
          theme="light"
          isAdmin={isAdmin}
          isLoggedIn={!!user}
          onLoginClick={() => setShowLogin(true)}
          onLogout={handleLogout}
        />

        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-8">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Helmet>
        <title>User Profile - Top Best Charts</title>
        <meta name="description" content="Manage your user profile and account settings" />
      </Helmet>

      <Header
        theme="light"
        isAdmin={isAdmin}
        isLoggedIn={!!user}
        onLoginClick={() => setShowLogin(true)}
        onLogout={handleLogout}
      />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-12">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                <UserIcon size={40} className="text-blue-600" />
              </div>
              <div className="text-white">
                <h1 className="text-3xl font-bold mb-1">User Profile</h1>
                <p className="text-blue-100">Manage your account</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {!user ? (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <LoginIcon size={64} className="mx-auto text-gray-300 mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h2>
                  <p className="text-gray-600 mb-8">Please log in to view your profile</p>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md hover:shadow-lg"
                  >
                    Sign In or Create Account
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {profileLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {profile && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                            Username
                          </label>
                          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <UserIcon size={20} className="text-gray-400" />
                            <span className="text-gray-900 font-medium">@{profile.username}</span>
                          </div>
                        </div>

                        {profile.display_name && (
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                              Display Name
                            </label>
                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <UserIcon size={20} className="text-gray-400" />
                              <span className="text-gray-900 font-medium">{profile.display_name}</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                        Email Address
                      </label>
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <Mail size={20} className="text-gray-400" />
                        <span className="text-gray-900 font-medium">{user.email}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                        Account Created
                      </label>
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <Calendar size={20} className="text-gray-400" />
                        <span className="text-gray-900 font-medium">
                          {formatDate(user.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                        Last Sign In
                      </label>
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <Calendar size={20} className="text-gray-400" />
                        <span className="text-gray-900 font-medium">
                          {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Award size={24} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Membership Tier {membershipTier}</h3>
                        <p className="text-sm text-gray-600">
                          {membershipTier === 1 && 'Free Tier'}
                          {membershipTier === 2 && 'Basic Tier'}
                          {membershipTier === 3 && 'Pro Tier'}
                          {membershipTier === 4 && 'Premium Tier'}
                          {membershipTier === 5 && 'Enterprise Tier'}
                        </p>
                      </div>
                    </div>
                    {membershipTier < 5 && (
                      <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-md hover:shadow-lg text-sm">
                        <TrendingUp size={16} />
                        Upgrade
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Keyword Limit
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {getKeywordLimit(membershipTier) === -1 ? 'Unlimited' : getKeywordLimit(membershipTier).toLocaleString()}
                      </p>
                      {getKeywordLimit(membershipTier) !== -1 && (
                        <p className="text-xs text-gray-500 mt-1">keywords per brand</p>
                      )}
                    </div>

                    {membershipTier < 5 && (
                      <div className="bg-white rounded-lg p-4 border border-blue-100">
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Next Tier
                        </p>
                        <p className="text-lg font-bold text-blue-600">
                          Tier {membershipTier + 1}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {getKeywordLimit(membershipTier + 1) === -1 ? 'Unlimited' : `${getKeywordLimit(membershipTier + 1).toLocaleString()} keywords`}
                        </p>
                      </div>
                    )}
                  </div>

                  {membershipTier < 5 && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <p className="text-sm text-gray-700">
                        <strong>Upgrade benefits:</strong> Access to more keywords, advanced analytics, and priority support.
                      </p>
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-blue-800">
                          <UserIcon size={20} />
                          <span className="font-semibold">Admin Account</span>
                        </div>
                        <p className="text-blue-700 text-sm mt-1">
                          You have administrator privileges on this site.
                        </p>
                      </div>
                      <Link
                        to="/admin/users"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg whitespace-nowrap"
                      >
                        <Users size={18} />
                        <span>Manage Users</span>
                      </Link>
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-gray-200">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold shadow-md hover:shadow-lg"
                  >
                    <LogOut size={20} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {showLogin && (
        <Login onClose={handleLoginClose} theme="light" />
      )}
    </div>
  );
}
