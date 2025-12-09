import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { TrendingUp, Circle, BarChart3, PieChart, Grid3x3, Target, Users, Lightbulb } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Login from '../components/Login';

export default function AboutPage() {
  const { isAdmin, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';
  });

  useEffect(() => {
    const prerenderFooter = document.getElementById('prerender-footer');
    if (prerenderFooter) {
      prerenderFooter.remove();
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.backgroundColor = theme === 'dark' ? '#111827' : '#f1f3f4';
  }, [theme]);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <Helmet>
        <title>About Us - Top Best Chart</title>
        <meta name="description" content="Learn about Top Best Chart, our mission to make data easy to understand, engaging, and visually stunning through interactive charts and rankings." />
      </Helmet>

      <Header
        theme={theme}
        isAdmin={isAdmin}
        onLoginClick={() => setShowLogin(true)}
        onLogout={logout}
        useH1={false}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className={`rounded-xl shadow-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="px-8 py-12">
            <h1 className={`text-4xl md:text-5xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              About Us – Top Best Chart
            </h1>

            <div className={`prose prose-lg max-w-none ${theme === 'dark' ? 'prose-invert' : ''}`}>
              <p className={`text-lg leading-relaxed mb-8 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                At Top Best Chart, our mission is simple: to make data easy to understand, engaging, and visually stunning. We transform complex rankings and statistics into interactive charts and lists that anyone can explore, whether you're a researcher, marketer, student, or simply curious.
              </p>

              <h2 className={`text-2xl font-bold mt-12 mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Our Platform Features
              </h2>

              <p className={`text-lg leading-relaxed mb-8 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Our platform features a variety of tools to help you visualize and analyze data effectively:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-10">
                <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Top List
                      </h3>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        Quickly browse the highest-ranked items in a clean, easy-to-read format.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
                      <Circle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Bubble Chart
                      </h3>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        Visualize trends and impact at a glance using scalable bubbles.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Bar Chart
                      </h3>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        Compare items side-by-side with clarity and precision.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                      <PieChart className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Donut Chart
                      </h3>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        See proportional breakdowns in a modern, intuitive layout.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-lg md:col-span-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                      <Grid3x3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Treemap
                      </h3>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        Explore hierarchical data with a clear and structured visual hierarchy.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <p className={`text-lg leading-relaxed mb-8 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                We believe that data should tell a story, not overwhelm you. That's why Top Best Chart combines simplicity, interactivity, and accuracy to help you discover patterns, trends, and insights across a wide range of topics.
              </p>

              <p className={`text-lg leading-relaxed mb-8 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Whether you're tracking the most popular dog breeds, analyzing top salaries, or comparing products and trends, Top Best Chart turns raw numbers into actionable insights that are easy to understand and share.
              </p>

              <h2 className={`text-2xl font-bold mt-12 mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Our Vision
              </h2>

              <p className={`text-lg leading-relaxed mb-8 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Our vision is to be the go-to hub for anyone seeking the most popular, top-performing, or trend-setting items in the world, presented in a way that's both informative and visually engaging.
              </p>

              <h2 className={`text-2xl font-bold mt-12 mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Our Commitment
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10">
                <div className={`p-6 rounded-lg text-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Target className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className={`font-bold text-lg mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Accuracy & Reliability
                  </h3>
                  <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    All data sources are carefully verified for accuracy and reliability.
                  </p>
                </div>

                <div className={`p-6 rounded-lg text-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className={`font-bold text-lg mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    User-Friendly Design
                  </h3>
                  <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    Clear, interactive, and mobile-friendly design for everyone.
                  </p>
                </div>

                <div className={`p-6 rounded-lg text-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                      <Lightbulb className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className={`font-bold text-lg mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Instant Insights
                  </h3>
                  <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    Helping our users make sense of the numbers in seconds.
                  </p>
                </div>
              </div>

              <p className={`text-lg leading-relaxed mb-8 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Join us in exploring the world's top charts, uncovering trends, and making data fun, intuitive, and meaningful.
              </p>

              <div className={`mt-12 p-8 rounded-lg text-center ${theme === 'dark' ? 'bg-gradient-to-r from-blue-900 to-teal-900' : 'bg-gradient-to-r from-blue-50 to-teal-50'}`}>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Discover. Compare. Visualize.
                </p>
                <p className={`text-xl mt-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>
                  That's Top Best Chart.
                </p>
              </div>
            </div>
          </div>
        </article>
      </main>

      <Footer theme={theme} />
      {showLogin && <Login onClose={() => setShowLogin(false)} theme={theme} />}
    </div>
  );
}
