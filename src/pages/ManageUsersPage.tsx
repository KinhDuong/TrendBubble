import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Users, Shield, Trash2, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
}

export default function ManageUsersPage() {
  const { user, isAdmin, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    console.log('ManageUsersPage mounted. isAdmin:', isAdmin, 'user:', user, 'authLoading:', authLoading);

    if (authLoading) {
      console.log('Auth still loading, waiting...');
      return;
    }

    if (!isAdmin) {
      console.log('User is not admin, redirecting to profile');
      navigate('/profile');
      return;
    }
    console.log('User is admin, loading users');
    loadUsers();
  }, [isAdmin, authLoading, navigate]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users/list`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load users');
      }

      const { users: formattedUsers } = await response.json();
      setUsers(formattedUsers);
    } catch (error: any) {
      console.error('Error loading users:', error);
      showMessage('error', error.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const toggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users/toggle-admin`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, isAdmin: currentIsAdmin }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update admin status');
      }

      showMessage('success', currentIsAdmin ? 'Admin privileges removed' : 'Admin privileges granted');
      await loadUsers();
    } catch (error: any) {
      console.error('Error toggling admin:', error);
      showMessage('error', error.message || 'Failed to update admin status');
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email}? This action cannot be undone.`)) {
      return;
    }

    if (userId === user?.id) {
      showMessage('error', 'You cannot delete your own account');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users/delete`;
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      showMessage('success', `User ${email} deleted successfully`);
      await loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      showMessage('error', error.message || 'Failed to delete user');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Helmet>
        <title>Manage Users - Top Best Charts</title>
        <meta name="description" content="Manage users and permissions" />
      </Helmet>

      <Header
        theme="light"
        isAdmin={isAdmin}
        onLoginClick={() => {}}
        onLogout={logout}
      />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-12">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                <Users size={40} className="text-blue-600" />
              </div>
              <div className="text-white">
                <h1 className="text-3xl font-bold mb-1">Manage Users</h1>
                <p className="text-blue-100">View and manage user accounts</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {message && (
              <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle size={20} />
                ) : (
                  <AlertCircle size={20} />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading users...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-gray-600">
                    Total users: <span className="font-semibold text-gray-900">{users.length}</span>
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Last Sign In</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((userData) => (
                        <tr key={userData.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">{userData.email}</span>
                              <span className="text-xs text-gray-500 font-mono">{userData.id}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-600 text-sm">
                            {formatDate(userData.created_at)}
                          </td>
                          <td className="py-4 px-4 text-gray-600 text-sm">
                            {formatDate(userData.last_sign_in_at)}
                          </td>
                          <td className="py-4 px-4">
                            {userData.is_admin ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                <Shield size={14} />
                                Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                                User
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              {userData.id !== user?.id && (
                                <>
                                  <button
                                    onClick={() => toggleAdmin(userData.id, userData.is_admin)}
                                    className={`p-2 rounded-lg transition-colors ${
                                      userData.is_admin
                                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                    }`}
                                    title={userData.is_admin ? 'Remove admin privileges' : 'Grant admin privileges'}
                                  >
                                    {userData.is_admin ? (
                                      <Shield size={18} />
                                    ) : (
                                      <UserPlus size={18} />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => deleteUser(userData.id, userData.email)}
                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                    title="Delete user"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </>
                              )}
                              {userData.id === user?.id && (
                                <span className="text-sm text-gray-400 italic px-2">You</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {users.length === 0 && (
                  <div className="text-center py-12">
                    <Users size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600">No users found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
