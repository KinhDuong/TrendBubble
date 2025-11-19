import { useState, useEffect } from 'react';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import PublicView from './components/PublicView';
import { supabase } from './lib/supabase';
import { useAuth } from './hooks/useAuth';

function App() {
  const { isAdmin, isLoading: authLoading, logout } = useAuth();
  const [view, setView] = useState<'admin' | 'public'>('admin');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    loadThemePreference();
  }, []);


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

  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <PublicView />;
  }

  if (view === 'public') {
    return <PublicView />;
  }

  return (
    <AdminDashboard
      onViewPublic={() => setView('public')}
      logout={logout}
      theme={theme}
    />
  );
}

export default App;
