import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Login from './components/Login';
import TrendingBubble from './pages/TrendingBubble';
import BubblePage from './pages/BubblePage';
import { useAuth } from './hooks/useAuth';
import { LogOut, Home, TrendingUp, LogIn } from 'lucide-react';
import { useState } from 'react';

function Navigation() {
  const { user, isAdmin, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors">
                <Home size={20} />
                <span className="font-medium">Home</span>
              </Link>
              <Link to="/trending-bubble" className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors">
                <TrendingUp size={20} />
                <span className="font-medium">Trending Bubble</span>
              </Link>
              <Link to="/google-trends" className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors">
                <TrendingUp size={20} />
                <span className="font-medium">Google Only</span>
              </Link>
              <Link to="/user-uploads" className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors">
                <TrendingUp size={20} />
                <span className="font-medium">User Uploads</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-gray-300 text-sm">
                    {user.email}
                    {isAdmin && <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">Admin</span>}
                  </span>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  <LogIn size={16} />
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
      {showLogin && <Login onClose={() => setShowLogin(false)} />}
    </>
  );
}

function HomePage() {
  return (
    <div>
      <Navigation />
      <BubblePage title="Google Trends - All Topics" showFileUpload={true} />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/trending-bubble" element={<TrendingBubble />} />
        <Route
          path="/google-trends"
          element={
            <div>
              <Navigation />
              <BubblePage
                title="Google Trends Only"
                source="google_trends"
                showFileUpload={false}
              />
            </div>
          }
        />
        <Route
          path="/user-uploads"
          element={
            <div>
              <Navigation />
              <BubblePage
                title="User Uploaded Topics"
                source="user_upload"
                showFileUpload={true}
              />
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
