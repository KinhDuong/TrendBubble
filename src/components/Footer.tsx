import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { useState, useEffect, memo } from 'react';
import { supabase } from '../lib/supabase';

interface FooterProps {
  theme: 'dark' | 'light';
}

interface Page {
  id: string;
  page_url: string;
  meta_title: string;
}

const CURRENT_YEAR = new Date().getFullYear();

function Footer({ theme }: FooterProps) {
  const currentYear = CURRENT_YEAR;
  const isDark = theme === 'dark';
  const [pages, setPages] = useState<Page[]>([]);

  useEffect(() => {
    const loadPages = async () => {
      try {
        const { data, error } = await supabase
          .from('pages')
          .select('id, page_url, meta_title')
          .neq('page_url', '/explore')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setPages(data || []);
      } catch (error) {
        console.error('Error loading pages:', error);
      }
    };

    loadPages();
  }, []);

  return (
    <footer className={`border-t ${isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-600 shadow-inner'}`}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="flex items-center justify-center md:justify-start lg:col-span-1 md:col-span-2">
            <Link to="/" className="relative w-24 h-24 flex-shrink-0 rounded-full shadow-lg border-4 border-blue-600 overflow-hidden flex items-center justify-center bg-transparent hover:scale-105 transition-transform">
              <BarChart3 size={48} strokeWidth={4} className="text-blue-600 relative z-10" />
            </Link>
          </div>

          <div>
            <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Features
            </h3>
            <ul className="text-sm space-y-2">
              <li>Top List – Quickly browse the highest-ranked items in a clean, easy-to-read format</li>
              <li>Bubble Chart – Visualize data based on scale and impact</li>
              <li>Bar Chart – Compare items side-by-side with clarity</li>
              <li>Donut Chart – View proportional breakdowns in a modern, intuitive layout</li>
              <li>Treemap – Explore hierarchical data with a clear visual structure</li>
            </ul>
          </div>

          <div>
            <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              About
            </h3>
            <p className="text-sm mb-3">
              We turn boring rankings into beautiful, interactive stories.
              Every bubble, bar, and sparkline is built from the latest official data and refreshed the moment new numbers drop. No fluff, no paywalls - just the clearest and most up-to-date data. Made by data nerds, for the endlessly curious.
            </p>
            <Link
              to="/about"
              className={`text-sm font-medium hover:underline ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
            >
              Learn more about us →
            </Link>
          </div>

          <div>
            <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Browse Pages
            </h3>
            <ul className="text-sm space-y-2 max-h-64 overflow-y-auto">
              <li>
                <Link
                  to="/browse-topics"
                  className={`font-semibold hover:underline ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                >
                  View All Topics by Category →
                </Link>
              </li>
              {pages.map((page) => (
                <li key={page.id}>
                  <Link
                    to={page.page_url}
                    className={`hover:underline ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                  >
                    {page.meta_title}
                  </Link>
                </li>
              ))}
              {pages.length === 0 && (
                <li className={`italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  No pages available
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className={`mt-8 pt-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className={`text-center text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            <p>{currentYear} Top Best Charts. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default memo(Footer);
