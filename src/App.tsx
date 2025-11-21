import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import BubbleChart from './components/BubbleChart';
import FileUpload from './components/FileUpload';
import Login from './components/Login';
import TrendingBubble from './pages/TrendingBubble';
import { TrendingTopic } from './types';
import { supabase } from './lib/supabase';
import { useAuth } from './hooks/useAuth';
import { LogOut, Home, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown, LogIn } from 'lucide-react';

type SortField = 'name' | 'category' | 'searchVolume' | 'rank' | 'pubDate' | 'createdAt';
type SortDirection = 'asc' | 'desc';

function HomePage() {
  const { isAdmin, logout } = useAuth();
  const location = useLocation();
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const isMobile = window.innerWidth < 768;
  const [maxBubbles, setMaxBubbles] = useState<number>(50);
  const [dateFilter, setDateFilter] = useState<'now' | 'all' | '24h' | 'week' | 'month' | 'year'>('now');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'bubble' | 'list'>('bubble');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showBackups, setShowBackups] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);
  const [nextUpdateIn, setNextUpdateIn] = useState<string>('');
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [nextBubbleIn, setNextBubbleIn] = useState<string>('');
  const [bubbleProgress, setBubbleProgress] = useState<number>(0);
  const [oldestBubbleTime, setOldestBubbleTime] = useState<number | null>(null);
  const [oldestBubbleCreated, setOldestBubbleCreated] = useState<number | null>(null);
  const [oldestBubbleLifetime, setOldestBubbleLifetime] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);

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
    const now = new Date();
    const currentHour = new Date(now);
    currentHour.setMinutes(0, 0, 0);
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);

    const diff = nextHour.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    setNextUpdateIn(`${minutes}:${seconds.toString().padStart(2, '0')}`);

    const hourDuration = 60 * 60 * 1000;
    const elapsed = now.getTime() - currentHour.getTime();
    const progress = Math.min(100, Math.max(0, (elapsed / hourDuration) * 100));
    setUpdateProgress(progress);
  };

  const handleBubbleTimingUpdate = (nextPopTime: number | null, createdTime?: number, lifetime?: number) => {
    setOldestBubbleTime(nextPopTime);
    setOldestBubbleCreated(createdTime || null);
    setOldestBubbleLifetime(lifetime || null);
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
        (existingTopics || []).map(t => [t.name.trim().toLowerCase(), t])
      );

      const topicsToInsert = [];
      const topicsToUpdate = [];
      const historySnapshots = [];
      const seenInCSV = new Map<string, number[]>();
      let duplicatesSkipped = 0;

      for (let index = 0; index < parsedTopics.length; index++) {
        const topic = parsedTopics[index];
        const normalizedName = topic.name.trim().toLowerCase();

        if (seenInCSV.has(normalizedName)) {
          duplicatesSkipped++;
          seenInCSV.get(normalizedName)!.push(index + 1);
          continue;
        }
        seenInCSV.set(normalizedName, [index + 1]);

        const existing = existingMap.get(normalizedName);

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

      let updateCount = 0;
      if (topicsToUpdate.length > 0) {
        for (const topic of topicsToUpdate) {
          const { error } = await supabase
            .from('trending_topics')
            .update(topic)
            .eq('id', topic.id);

          if (error) {
            console.error(`Error updating topic ${topic.name}:`, error);
          } else {
            updateCount++;
          }
        }
      }

      let insertCount = 0;
      let insertErrors = 0;
      if (topicsToInsert.length > 0) {
        for (const topic of topicsToInsert) {
          const { data, error } = await supabase
            .from('trending_topics')
            .insert(topic)
            .select('id, name, search_volume, search_volume_raw, rank, url')
            .maybeSingle();

          if (error) {
            if (error.code === '23505') {
              const { data: updateData, error: updateError } = await supabase
                .from('trending_topics')
                .update({
                  search_volume: topic.search_volume,
                  search_volume_raw: topic.search_volume_raw,
                  rank: topic.rank,
                  url: topic.url,
                  category: topic.category,
                  pub_date: topic.pub_date
                })
                .eq('id', (await supabase
                  .from('trending_topics')
                  .select('id')
                  .ilike('name', topic.name)
                  .maybeSingle())?.data?.id)
                .select('id, name, search_volume, search_volume_raw, rank, url')
                .maybeSingle();

              if (!updateError && updateData) {
                insertCount++;
                historySnapshots.push({
                  topic_id: updateData.id,
                  name: updateData.name,
                  search_volume: updateData.search_volume,
                  search_volume_raw: updateData.search_volume_raw,
                  rank: updateData.rank,
                  url: updateData.url,
                  snapshot_at: now
                });
              } else {
                insertErrors++;
              }
            } else {
              insertErrors++;
            }
          } else if (data) {
            insertCount++;
            historySnapshots.push({
              topic_id: data.id,
              name: data.name,
              search_volume: data.search_volume,
              search_volume_raw: data.search_volume_raw,
              rank: data.rank,
              url: data.url,
              snapshot_at: now
            });
          }
        }
      }

      if (historySnapshots.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < historySnapshots.length; i += batchSize) {
          const batch = historySnapshots.slice(i, i + batchSize);
          const { error } = await supabase
            .from('trending_topics_history')
            .insert(batch);

          if (error) {
            console.error(`Error inserting history batch ${i / batchSize + 1}:`, error);
          }
        }
      }

      await loadTopics();

      const duplicatesReport = Array.from(seenInCSV.entries())
        .filter(([_, rows]) => rows.length > 1)
        .map(([name, rows]) => `"${parsedTopics[rows[0] - 1].name}" appears on rows: ${rows.join(', ')}`)
        .join('\n');

      console.log('=== DUPLICATE ANALYSIS ===');
      console.log(`Total rows in CSV: ${parsedTopics.length}`);
      console.log(`Unique topics: ${seenInCSV.size}`);
      console.log(`Duplicate instances: ${duplicatesSkipped}`);
      if (duplicatesReport) {
        console.log('\nDuplicate topics and their row numbers:');
        console.log(duplicatesReport);
      }

      if (parsedTopics.length >= 222) {
        const row222 = parsedTopics[221];
        const row222Name = row222.name.trim().toLowerCase();
        const row222Rows = seenInCSV.get(row222Name) || [];
        console.log('\n=== ROW 222 ANALYSIS ===');
        console.log(`Row 222 topic: "${row222.name}"`);
        console.log(`Volume: ${row222.searchVolumeRaw}`);
        console.log(`All occurrences on rows: ${row222Rows.join(', ')}`);
        if (row222Rows.length > 1) {
          console.log('\nAll instances:');
          row222Rows.forEach(rowNum => {
            const t = parsedTopics[rowNum - 1];
            console.log(`  Row ${rowNum}: "${t.name}" - Volume: ${t.searchVolumeRaw}`);
          });
        }
      }

      const message = `Upload complete!\nTotal in CSV: ${parsedTopics.length}\nDuplicates in CSV: ${duplicatesSkipped}\nUpdated: ${updateCount}\nInserted: ${insertCount}\nFailed: ${insertErrors}\n\nCheck console for duplicate analysis.`;
      setUploadMessage(message);
    } catch (error) {
      console.error('Error saving topics:', error);
      setUploadMessage(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedTopics = () => {
    const sorted = [...topics].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'category':
          aValue = (a.category || '').toLowerCase();
          bValue = (b.category || '').toLowerCase();
          break;
        case 'searchVolume':
          aValue = a.searchVolume;
          bValue = b.searchVolume;
          break;
        case 'rank':
          aValue = topics.indexOf(a);
          bValue = topics.indexOf(b);
          break;
        case 'pubDate':
          aValue = a.pubDate ? new Date(a.pubDate).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          bValue = b.pubDate ? new Date(b.pubDate).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          break;
        case 'createdAt':
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="opacity-50" />;
    }
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  if (!isAdmin && showLogin) {
    return <Login onLogin={loadTopics} theme={theme} />;
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {isAdmin && (
        <header className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b py-4 md:py-6 px-3 md:px-6 shadow-sm`}>
          <div className="max-w-7xl mx-auto">
            <div className={`text-center mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-xs font-semibold uppercase tracking-wide`}>
              Admin Menu
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-4">
              <div className="flex-1 w-full">
                <nav className="flex justify-center gap-4">
                <Link
                  to="/"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/'
                      ? theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : theme === 'dark'
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Home size={16} />
                  Table View
                </Link>
                <Link
                  to="/trending-bubble"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/trending-bubble'
                      ? theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : theme === 'dark'
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <TrendingUp size={16} />
                  Trending Bubble
                </Link>
              </nav>
            </div>
            <div className="flex gap-2 md:gap-3">
              <button
                onClick={logout}
                className={`px-3 md:px-4 py-1.5 md:py-2 ${theme === 'dark' ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} rounded-lg transition-colors text-xs md:text-sm font-medium text-white flex items-center gap-2`}
              >
                <LogOut size={16} />
                Logout
              </button>
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
          <FileUpload onUpload={handleFileUpload} theme={theme} />
        </div>
      </header>
      )}

      <div className="p-2 md:p-6">
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

        {uploadMessage && (
          <div className="fixed top-4 right-4 z-50 max-w-md">
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-xl p-4`}>
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-line`}>
                    {uploadMessage}
                  </div>
                </div>
                <button
                  onClick={() => setUploadMessage(null)}
                  className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} text-xl leading-none flex-shrink-0`}
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

        <header className="relative mb-3 md:mb-4">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold">Google Trending Topics - Real-Time Search Trends</h1>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-xs md:text-sm mt-1 md:mt-2`}>
              Track real-time trending topics on Google with interactive visualization · Bubble size represents search volume · Auto-updates hourly
            </p>
          </div>
          {!isAdmin && (
            <button
              onClick={() => setShowLogin(true)}
              className={`absolute right-0 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
              title="Admin Login"
              aria-label="Admin Login"
            >
              <LogIn size={24} />
            </button>
          )}
        </header>
      </div>

      <main role="main" aria-label="Trending topics visualization">
        {loading && (
          <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading 50 bubbles...</div>
        )}
        {!loading && (
          <>
            <nav className="flex justify-center mb-3 md:mb-4 px-3" aria-label="Trending topics filters">
              <div className={`w-full max-w-4xl ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} px-3 md:px-6 py-3 rounded-lg border shadow-sm overflow-x-auto`}>
                <div className="flex md:flex-wrap items-center gap-3 md:gap-4 min-w-max md:min-w-0">
                  <div className="flex items-center gap-2">
                    <label htmlFor="dateFilter" className="text-xs font-medium whitespace-nowrap">
                      Trending:
                    </label>
                    <select
                      id="dateFilter"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value as 'now' | 'all' | '24h' | 'week' | 'month' | 'year')}
                      className={`flex-1 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      aria-label="Filter trending topics by date range"
                    >
                      <option value="now">Now</option>
                      <option value="all">All Time</option>
                      <option value="24h">24 Hours</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                    </select>
                  </div>
                  <div className={`hidden md:block w-px h-6 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="categoryFilter" className="text-xs font-medium whitespace-nowrap">
                      Category:
                    </label>
                    <select
                      id="categoryFilter"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className={`flex-1 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      aria-label="Filter trending topics by category"
                    >
                      <option value="all">All</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div className={`hidden md:block w-px h-6 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                  {viewMode === 'bubble' && (
                    <>
                      <div className="flex items-center gap-2">
                        <label htmlFor="maxBubbles" className="text-xs font-medium whitespace-nowrap">
                          Bubbles:
                        </label>
                        <select
                          id="maxBubbles"
                          value={maxBubbles}
                          onChange={(e) => setMaxBubbles(Number(e.target.value))}
                          className={`flex-1 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          aria-label="Maximum number of bubbles to display"
                        >
                          <option value={20}>20</option>
                          <option value={40}>40</option>
                          <option value={50}>50</option>
                          <option value={80}>80</option>
                          <option value={100}>100</option>
                          <option value={150}>150</option>
                          <option value={200}>200</option>
                        </select>
                      </div>
                      <div className={`hidden md:block w-px h-6 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <select
                      id="themeFilter"
                      value={theme}
                      onChange={(e) => handleThemeChange(e.target.value as 'dark' | 'light')}
                      className={`flex-1 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      aria-label="Select theme style"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                    </select>
                  </div>
                  <div className={`hidden md:block w-px h-6 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                  <button
                    onClick={() => setViewMode(viewMode === 'bubble' ? 'list' : 'bubble')}
                    className={`px-4 py-1.5 text-xs font-medium ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} rounded transition-colors text-white whitespace-nowrap`}
                    aria-label={`Switch to ${viewMode === 'bubble' ? 'list' : 'bubble'} view`}
                  >
                    {viewMode === 'bubble' ? 'List' : 'Bubble'}
                  </button>
                    <div className={`hidden md:flex items-center gap-1.5 px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
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
                    <span className="text-xs font-mono">{nextUpdateIn}</span>
                  </div>
                  <div className={`hidden md:flex items-center gap-1.5 px-2 py-1 rounded ${theme === 'dark' ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
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
                    <span className="text-xs font-mono">{nextBubbleIn}</span>
                  </div>
                </div>
              </div>
            </nav>
            {topics.length > 0 && (
              viewMode === 'bubble' ? (
                <BubbleChart topics={topics} maxDisplay={maxBubbles} theme={theme} onBubbleTimingUpdate={handleBubbleTimingUpdate} />
              ) : (
              <div className="max-w-6xl mx-auto">
                <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border overflow-hidden shadow-sm`}>
                  <div className={`grid grid-cols-6 gap-4 px-6 py-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} font-semibold text-sm`}>
                    <button
                      onClick={() => handleSort('name')}
                      className={`flex items-center gap-1 hover:${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} transition-colors`}
                    >
                      Topic <SortIcon field="name" />
                    </button>
                    <button
                      onClick={() => handleSort('category')}
                      className={`flex items-center justify-center gap-1 hover:${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} transition-colors`}
                    >
                      Category <SortIcon field="category" />
                    </button>
                    <button
                      onClick={() => handleSort('searchVolume')}
                      className={`flex items-center justify-center gap-1 hover:${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} transition-colors`}
                    >
                      Search Volume <SortIcon field="searchVolume" />
                    </button>
                    <button
                      onClick={() => handleSort('rank')}
                      className={`flex items-center justify-center gap-1 hover:${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} transition-colors`}
                    >
                      Rank <SortIcon field="rank" />
                    </button>
                    <button
                      onClick={() => handleSort('pubDate')}
                      className={`flex items-center justify-center gap-1 hover:${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} transition-colors`}
                    >
                      Started (ET) <SortIcon field="pubDate" />
                    </button>
                    <button
                      onClick={() => handleSort('createdAt')}
                      className={`flex items-center justify-center gap-1 hover:${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} transition-colors`}
                    >
                      Added (ET) <SortIcon field="createdAt" />
                    </button>
                  </div>
                  <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {getSortedTopics().map((topic, index) => (
                      <div key={index} className={`grid grid-cols-6 gap-4 px-6 py-4 ${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors`}>
                        <div className="font-medium">{topic.name.replace(/"/g, '')}</div>
                        <div className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{topic.category || '-'}</div>
                        <div className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{topic.searchVolumeRaw.replace(/"/g, '')}</div>
                        <div className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>#{index + 1}</div>
                        <div className={`text-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {(topic.pubDate || topic.createdAt) ? new Date(topic.pubDate || topic.createdAt).toLocaleString('en-US', {
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
              )
            )}
          </>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/trending-bubble" element={<TrendingBubble />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
