import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { User as UserIcon, Mail, Calendar, LogOut, LogIn } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import UserLogin from '../components/UserLogin';

export default function UserProfilePage() {
  const { user, isAdmin, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(!user);

  const handleLogout = async () => {
    await logout();
    setShowLogin(true);
  };

  const handleLoginSuccess = () => {
    setShowLogin(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Helmet>
        <title>User Profile - Top Best Charts</title>
        <meta name="description" content="Manage your user profile and account settings" />
      </Helmet>

      <Header
        theme="light"
        isAdmin={isAdmin}
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
                  <LogIn size={64} className="mx-auto text-gray-300 mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h2>
                  <p className="text-gray-600 mb-8">Please log in to view your profile</p>
                </div>

                {showLogin && (
                  <div className="max-w-md mx-auto">
                    <UserLogin onSuccess={handleLoginSuccess} />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
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
                      User ID
                    </label>
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <UserIcon size={20} className="text-gray-400" />
                      <span className="text-gray-900 font-mono text-sm">{user.id}</span>
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

                {isAdmin && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800">
                      <UserIcon size={20} />
                      <span className="font-semibold">Admin Account</span>
                    </div>
                    <p className="text-blue-700 text-sm mt-1">
                      You have administrator privileges on this site.
                    </p>
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
    </div>
  );
}
