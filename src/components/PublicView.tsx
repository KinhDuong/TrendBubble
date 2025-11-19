import { useState, useEffect } from 'react';
import BubbleChart from './BubbleChart';
import { TrendingTopic } from '../types';
import { supabase } from '../lib/supabase';

export default function PublicView() {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const isMobile = window.innerWidth < 768;
  const [maxBubbles, setMaxBubbles] = useState<number>(isMobile ? 40 : 60);
  const [dateFilter, setDateFilter] = useState<'now' | 'all' | '24h' | 'week' | 'month' | 'year'>('now');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'bubble' | 'list'>('bubble');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [nextUpdateIn, setNextUpdateIn] = useState<string>('');
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [nextBubbleIn, setNextBubbleIn] = useState<string>('');
  const [bubbleProgress, setBubbleProgress] = useState<number>(0);
  const [oldestBubbleTime, setOldestBubbleTime] = useState<number | null>(null);
  const [oldestBubbleCreated, setOldestBubbleCreated] = useState<number | null>(null);
  const [oldestBubbleLifetime, setOldestBubbleLifetime] = useState<number | null>(null);

  useEffect(() => {
    loadTopics();
    loadThemePreference();
    loadCategories();
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const bubbleInterval = setInterval(() => {
      if (oldestBubbleTime && oldestBubbleCreated && oldestBubbleLifetime) {
        const now = Date.now();
        const remaining = oldestBubbleTime - now;
        const elapsed = now - oldestBubbleCreated;
        const progress = Math.min(100, Math.max(0, (elapsed / oldestBubbleLifetime) * 100));

        setBubbleProgress(progress);

        if (remaining > 0) {
          const seconds = Math.ceil(remaining / 1000);
          setNextBubbleIn(`${seconds}s`);
        } else {
          setNextBubbleIn('0s');
        }
      } else {
        setNextBubbleIn('--');
        setBubbleProgress(0);
      }
    }, 100);
    return () => clearInterval(bubbleInterval);
  }, [oldestBubbleTime, oldestBubbleCreated, oldestBubbleLifetime]);

  useEffect(() => {
    loadTopics();
  }, [dateFilter, categoryFilter]);

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

  const updateCountdown = () => {
    const now = Date.now();
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    const remaining = nextHour.getTime() - now;
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    setNextUpdateIn(`${minutes}m ${seconds}s`);

    const hourInMs = 3600000;
    const elapsed = hourInMs - remaining;
    const progress = Math.min(100, Math.max(0, (elapsed / hourInMs) * 100));
    setUpdateProgress(progress);
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('trending_topics')
        .select('category')
        .not('category', 'is', null);

      if (error) throw error;

      const uniqueCategories = Array.from(new Set(data.map(item => item.category).filter(Boolean)));
      setCategories(uniqueCategories as string[]);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadTopics = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('trending_topics')
        .select('*')
        .order('volume', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (dateFilter !== 'all') {
        const now = new Date();
        let cutoffDate = new Date();

        switch (dateFilter) {
          case 'now':
            cutoffDate = new Date(now.getTime() - 1 * 60 * 60 * 1000);
            break;
          case '24h':
            cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case 'week':
            cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        }

        query = query.gte('created_at', cutoffDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      setTopics(data || []);

      if (data && data.length > 0) {
        const oldestTopic = data[data.length - 1];
        if (oldestTopic.created_at) {
          const createdTime = new Date(oldestTopic.created_at).getTime();
          const lifetime = 60 * 60 * 1000;
          const expiryTime = createdTime + lifetime;

          setOldestBubbleCreated(createdTime);
          setOldestBubbleTime(expiryTime);
          setOldestBubbleLifetime(lifetime);
        }
      }
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTopics = topics.slice(0, viewMode === 'bubble' ? maxBubbles : topics.length);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <header className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b py-4 md:py-6 px-3 md:px-6 shadow-sm`}>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-center">Trending Bubbles</h1>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-xs md:text-sm text-center mt-1 md:mt-2`}>
            Bubble size represents search volume · Auto-updates hourly
          </p>
        </div>
      </header>

      <main className="p-2 md:p-6">
        {loading && (
          <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</div>
        )}
        {topics.length > 0 && (
          <>
            <div className="flex justify-center mb-3 md:mb-4">
              <div className={`flex items-center gap-2 md:gap-4 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} px-3 md:px-6 py-2 md:py-3 rounded-lg border shadow-sm`}>
                {viewMode === 'bubble' && (
                  <>
                    <label htmlFor="maxBubbles" className="text-xs md:text-sm font-medium">
                      Max:
                    </label>
                    <select
                      id="maxBubbles"
                      value={maxBubbles}
                      onChange={(e) => setMaxBubbles(Number(e.target.value))}
                      className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value={40}>40</option>
                      <option value={50}>50</option>
                      <option value={80}>80</option>
                      <option value={100}>100</option>
                      <option value={150}>150</option>
                      <option value={200}>200</option>
                    </select>
                    <div className={`w-px h-4 md:h-6 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                  </>
                )}
                <label htmlFor="categoryFilter" className="text-xs md:text-sm font-medium">
                  Category:
                </label>
                <select
                  id="categoryFilter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="all">All</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <div className={`w-px h-4 md:h-6 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                <label htmlFor="dateFilter" className="text-xs md:text-sm font-medium">
                  Date:
                </label>
                <select
                  id="dateFilter"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as 'now' | 'all' | '24h' | 'week' | 'month' | 'year')}
                  className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="now">Now</option>
                  <option value="all">All Time</option>
                  <option value="24h">24 Hours</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
                <div className={`w-px h-4 md:h-6 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                <label htmlFor="themeFilter" className="text-xs md:text-sm font-medium">
                  Style:
                </label>
                <select
                  id="themeFilter"
                  value={theme}
                  onChange={(e) => handleThemeChange(e.target.value as 'dark' | 'light')}
                  className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
                <div className={`w-px h-4 md:h-6 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode(viewMode === 'bubble' ? 'list' : 'bubble')}
                    className={`px-3 md:px-4 py-1 md:py-1.5 text-xs md:text-sm font-medium ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} rounded transition-colors text-white`}
                  >
                    {viewMode === 'bubble' ? 'List' : 'Bubble'}
                  </button>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="relative h-3 w-3">
                      <svg className="h-3 w-3 -rotate-90" viewBox="0 0 24 24">
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          opacity="0.2"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeDasharray={`${2 * Math.PI * 10}`}
                          strokeDashoffset={`${2 * Math.PI * 10 * (1 - updateProgress / 100)}`}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-medium">{nextUpdateIn}</span>
                  </div>
                  {dateFilter === 'now' && (
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                      <div className="relative h-3 w-3">
                        <svg className="h-3 w-3 -rotate-90" viewBox="0 0 24 24">
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            opacity="0.2"
                          />
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeDasharray={`${2 * Math.PI * 10}`}
                            strokeDashoffset={`${2 * Math.PI * 10 * (1 - bubbleProgress / 100)}`}
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <span className="text-xs font-medium">{nextBubbleIn}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {viewMode === 'bubble' ? (
              <BubbleChart topics={filteredTopics} theme={theme} />
            ) : (
              <div className="max-w-7xl mx-auto">
                <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border shadow-sm overflow-hidden`}>
                  <div className={`${theme === 'dark' ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b px-6 py-3 grid grid-cols-12 gap-4 text-xs md:text-sm font-semibold`}>
                    <div className="col-span-1">#</div>
                    <div className="col-span-5">Topic</div>
                    <div className="col-span-2">Volume</div>
                    <div className="col-span-2">Category</div>
                    <div className="col-span-2">Added</div>
                  </div>
                  <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {filteredTopics.map((topic, index) => (
                      <div key={topic.id} className={`px-6 py-4 grid grid-cols-12 gap-4 items-center text-xs md:text-sm ${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}>
                        <div className="col-span-1 font-semibold">{index + 1}</div>
                        <div className="col-span-5">
                          {topic.url ? (
                            <a
                              href={topic.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} hover:underline`}
                            >
                              {topic.name}
                            </a>
                          ) : (
                            <span>{topic.name}</span>
                          )}
                        </div>
                        <div className="col-span-2 font-medium">{topic.volume.toLocaleString()}</div>
                        <div className="col-span-2">
                          {topic.category && (
                            <span className={`px-2 py-1 rounded text-xs ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                              {topic.category}
                            </span>
                          )}
                        </div>
                        <div className={`col-span-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {new Date(topic.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
