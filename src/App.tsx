import { useState, useEffect } from 'react';
import BubbleChart from './components/BubbleChart';
import FileUpload from './components/FileUpload';
import { TrendingTopic } from './types';
import { supabase } from './lib/supabase';

function App() {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const isMobile = window.innerWidth < 768;
  const [maxBubbles, setMaxBubbles] = useState<number>(isMobile ? 40 : 60);
  const [dateFilter, setDateFilter] = useState<'now' | 'all' | '24h' | 'week' | 'month' | 'year'>('now');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'bubble' | 'list'>('bubble');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showBackups, setShowBackups] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);

  useEffect(() => {
    loadTopics();
    loadThemePreference();
    loadCategories();
  }, []);

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

  const loadTopics = async () => {
    try {
      let query = supabase
        .from('trending_topics')
        .select('*');

      if (dateFilter === 'now') {
        const now = new Date();
        const recentDate = new Date();
        recentDate.setHours(now.getHours() - 12);
        query = query.gte('last_seen', recentDate.toISOString());
      } else if (dateFilter !== 'all') {
        const now = new Date();
        let startDate = new Date();

        switch (dateFilter) {
          case '24h':
            startDate.setHours(now.getHours() - 24);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }

        query = query.gte('first_seen', startDate.toISOString());
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query.order('rank', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedTopics: TrendingTopic[] = data.map(topic => ({
          name: topic.name,
          searchVolume: topic.search_volume,
          searchVolumeRaw: topic.search_volume_raw,
          url: topic.url,
          createdAt: topic.created_at,
          pubDate: topic.pub_date,
          category: topic.category
        }));
        setTopics(formattedTopics);
      } else {
        setTopics([]);
      }
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('trending_topics')
        .select('category')
        .not('category', 'is', null)
        .order('category');

      if (error) throw error;

      if (data) {
        const uniqueCategories = [...new Set(data.map(item => item.category).filter(Boolean))] as string[];
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const saveBackup = async () => {
    try {
      const { data: currentTopics } = await supabase
        .from('trending_topics')
        .select('*')
        .order('rank', { ascending: true });

      if (!currentTopics || currentTopics.length === 0) {
        alert('No data to backup');
        return;
      }

      const backupName = `Backup ${new Date().toLocaleString()}`;
      const backupContent = JSON.stringify(currentTopics);

      const { error } = await supabase
        .from('backups')
        .insert({
          name: backupName,
          file_path: `backup_${Date.now()}.json`,
          content: backupContent
        });

      if (error) throw error;

      alert('Backup saved successfully!');
    } catch (error) {
      console.error('Error saving backup:', error);
      alert('Failed to save backup');
    }
  };

  const loadBackups = async () => {
    try {
      const { data, error } = await supabase
        .from('backups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBackups(data || []);
      setShowBackups(true);
    } catch (error) {
      console.error('Error loading backups:', error);
      alert('Failed to load backups');
    }
  };

  const restoreBackup = async (backup: any) => {
    if (!confirm(`Restore backup from ${new Date(backup.created_at).toLocaleString()}? This will replace all current data.`)) {
      return;
    }

    try {
      const backupTopics = JSON.parse(backup.content);

      await supabase.from('trending_topics').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      const { error } = await supabase
        .from('trending_topics')
        .insert(backupTopics);

      if (error) throw error;

      await loadTopics();
      setShowBackups(false);
      alert('Backup restored successfully!');
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('Failed to restore backup');
    }
  };

  const manualUpdate = async () => {
    try {
      setLoading(true);
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-trends`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ triggered_by: 'manual' }),
      });

      const result = await response.json();

      if (result.success) {
        await loadTopics();
        alert('Trends updated successfully!');
      } else {
        throw new Error(result.error || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating trends:', error);
      alert('Failed to update trends');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (parsedTopics: TrendingTopic[]): Promise<void> => {
    try {
      const now = new Date().toISOString();
      const { data: existingTopics } = await supabase
        .from('trending_topics')
        .select('*');

      const existingMap = new Map(
        (existingTopics || []).map(t => [t.name.toLowerCase(), t])
      );

      const topicsToInsert = [];
      const topicsToUpdate = [];
      const historySnapshots = [];

      for (let index = 0; index < parsedTopics.length; index++) {
        const topic = parsedTopics[index];
        const existing = existingMap.get(topic.name.toLowerCase());

        if (existing) {
          const earliestPubDate = !topic.pubDate ? existing.pub_date :
            !existing.pub_date ? topic.pubDate :
            new Date(topic.pubDate) < new Date(existing.pub_date) ? topic.pubDate : existing.pub_date;

          topicsToUpdate.push({
            id: existing.id,
            name: topic.name,
            search_volume: topic.searchVolume,
            search_volume_raw: topic.searchVolumeRaw,
            rank: index + 1,
            url: topic.url || existing.url,
            pub_date: earliestPubDate,
            category: topic.category || existing.category,
            created_at: existing.created_at
          });

          historySnapshots.push({
            topic_id: existing.id,
            name: topic.name,
            search_volume: topic.searchVolume,
            search_volume_raw: topic.searchVolumeRaw,
            rank: index + 1,
            url: topic.url || existing.url,
            snapshot_at: now
          });
        } else {
          topicsToInsert.push({
            name: topic.name,
            search_volume: topic.searchVolume,
            search_volume_raw: topic.searchVolumeRaw,
            rank: index + 1,
            url: topic.url,
            pub_date: topic.pubDate,
            category: topic.category
          });
        }
      }

      if (topicsToUpdate.length > 0) {
        for (const topic of topicsToUpdate) {
          const { error } = await supabase
            .from('trending_topics')
            .update(topic)
            .eq('id', topic.id);

          if (error) throw error;
        }
      }

      const insertedTopicIds: string[] = [];
      if (topicsToInsert.length > 0) {
        const { data, error } = await supabase
          .from('trending_topics')
          .insert(topicsToInsert)
          .select('id, name, search_volume, search_volume_raw, rank, url');

        if (error) throw error;

        if (data) {
          for (const newTopic of data) {
            historySnapshots.push({
              topic_id: newTopic.id,
              name: newTopic.name,
              search_volume: newTopic.search_volume,
              search_volume_raw: newTopic.search_volume_raw,
              rank: newTopic.rank,
              url: newTopic.url,
              snapshot_at: now
            });
          }
        }
      }

      if (historySnapshots.length > 0) {
        const { error } = await supabase
          .from('trending_topics_history')
          .insert(historySnapshots);

        if (error) throw error;
      }

      await loadTopics();
    } catch (error) {
      console.error('Error saving topics:', error);
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <header className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b py-4 md:py-6 px-3 md:px-6 shadow-sm`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex-1 w-full">
            <h1 className="text-2xl md:text-3xl font-bold text-center">Google Trending Topics</h1>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-xs md:text-sm text-center mt-1 md:mt-2`}>
              Bubble size represents search volume · Auto-updates hourly
            </p>
          </div>
          <div className="flex gap-2 md:gap-3">
            <select
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value as 'dark' | 'light')}
              className={`px-3 md:px-4 py-1.5 md:py-2 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg transition-colors text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="dark">Dark Style</option>
              <option value="light">Light Style</option>
            </select>
            <button
              onClick={manualUpdate}
              disabled={loading}
              className={`px-3 md:px-4 py-1.5 md:py-2 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600' : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300'} disabled:cursor-not-allowed rounded-lg transition-colors text-xs md:text-sm font-medium text-white`}
            >
              {loading ? 'Updating...' : 'Update Now'}
            </button>
            <button
              onClick={saveBackup}
              className={`px-3 md:px-4 py-1.5 md:py-2 ${theme === 'dark' ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} rounded-lg transition-colors text-xs md:text-sm font-medium text-white`}
            >
              Save
            </button>
            <button
              onClick={loadBackups}
              className={`px-3 md:px-4 py-1.5 md:py-2 ${theme === 'dark' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'} rounded-lg transition-colors text-xs md:text-sm font-medium text-white`}
            >
              Restore
            </button>
          </div>
        </div>
      </header>

      <main className="p-2 md:p-6">
        {showBackups && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden`}>
              <div className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'} border-b px-6 py-4 flex justify-between items-center`}>
                <h2 className="text-xl font-bold">Restore Backup</h2>
                <button
                  onClick={() => setShowBackups(false)}
                  className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} text-2xl leading-none`}
                >
                  ×
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
                {backups.length === 0 ? (
                  <div className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-center py-8`}>
                    No backups found
                  </div>
                ) : (
                  <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {backups.map((backup) => (
                      <div key={backup.id} className={`px-6 py-4 flex justify-between items-center ${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}>
                        <div>
                          <div className="font-medium">{backup.name}</div>
                          <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {new Date(backup.created_at).toLocaleString()}
                          </div>
                        </div>
                        <button
                          onClick={() => restoreBackup(backup)}
                          className={`px-4 py-2 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} rounded-lg transition-colors text-sm font-medium text-white`}
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <FileUpload onUpload={handleFileUpload} theme={theme} />
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
                <button
                  onClick={() => setViewMode(viewMode === 'bubble' ? 'list' : 'bubble')}
                  className={`px-3 md:px-4 py-1 md:py-1.5 text-xs md:text-sm font-medium ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} rounded transition-colors text-white`}
                >
                  {viewMode === 'bubble' ? 'List' : 'Bubble'}
                </button>
              </div>
            </div>
            {viewMode === 'bubble' ? (
              <BubbleChart topics={topics} maxDisplay={maxBubbles} theme={theme} />
            ) : (
              <div className="max-w-6xl mx-auto">
                <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border overflow-hidden shadow-sm`}>
                  <div className={`grid grid-cols-6 gap-4 px-6 py-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} font-semibold text-sm`}>
                    <div>Topic</div>
                    <div className="text-center">Category</div>
                    <div className="text-center">Search Volume</div>
                    <div className="text-center">Rank</div>
                    <div className="text-center">Started (ET)</div>
                    <div className="text-center">Added (ET)</div>
                  </div>
                  <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {topics.map((topic, index) => (
                      <div key={index} className={`grid grid-cols-6 gap-4 px-6 py-4 ${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors`}>
                        <div className="font-medium">{topic.name.replace(/"/g, '')}</div>
                        <div className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{topic.category || '-'}</div>
                        <div className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{topic.searchVolumeRaw.replace(/"/g, '')}</div>
                        <div className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>#{index + 1}</div>
                        <div className={`text-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {topic.pubDate ? new Date(topic.pubDate).toLocaleString('en-US', {
                            timeZone: 'America/New_York',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          }) : '-'}
                        </div>
                        <div className={`text-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {topic.createdAt ? new Date(topic.createdAt).toLocaleString('en-US', {
                            timeZone: 'America/New_York',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          }) : '-'}
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

export default App;
