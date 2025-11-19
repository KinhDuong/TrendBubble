import { useState, useEffect } from 'react';
import FileUpload from './FileUpload';
import { TrendingTopic } from '../types';
import { supabase } from '../lib/supabase';
import { Eye, LogOut } from 'lucide-react';

interface AdminDashboardProps {
  onViewPublic: () => void;
  logout: () => void;
  theme: 'dark' | 'light';
}

export default function AdminDashboard({ onViewPublic, logout, theme }: AdminDashboardProps) {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBackups, setShowBackups] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trending_topics')
        .select('*')
        .order('search_volume', { ascending: false });

      if (error) throw error;

      const formattedTopics: TrendingTopic[] = (data || []).map(topic => ({
        name: topic.name,
        searchVolume: topic.search_volume,
        searchVolumeRaw: topic.search_volume_raw,
        url: topic.url,
        createdAt: topic.created_at,
        pubDate: topic.pub_date,
        category: topic.category
      }));

      setTopics(formattedTopics);
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const manualUpdate = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-trends`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to update trends');

      await loadTopics();
    } catch (error) {
      console.error('Error updating trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (newTopics: TrendingTopic[]) => {
    try {
      await saveTopics(newTopics);
      await loadTopics();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const saveBackup = async () => {
    try {
      const backupName = `Backup ${new Date().toLocaleString()}`;

      const { data: existingBackups, error: fetchError } = await supabase
        .from('backups')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;

      if (existingBackups && existingBackups.length >= 10) {
        const oldestBackupId = existingBackups[existingBackups.length - 1].id;
        const { error: deleteError } = await supabase
          .from('backups')
          .delete()
          .eq('id', oldestBackupId);

        if (deleteError) throw deleteError;
      }

      const { error } = await supabase
        .from('backups')
        .insert({ name: backupName, data: topics });

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
    }
  };

  const restoreBackup = async (backup: any) => {
    if (!confirm(`Are you sure you want to restore "${backup.name}"? This will replace all current data.`)) {
      return;
    }

    try {
      await saveTopics(backup.data);
      setShowBackups(false);
      await loadTopics();
      alert('Backup restored successfully!');
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('Failed to restore backup');
    }
  };

  const saveTopics = async (topicsToSave: TrendingTopic[]) => {
    try {
      const { data: existingTopics, error: fetchError } = await supabase
        .from('trending_topics')
        .select('*');

      if (fetchError) throw fetchError;

      const existingTopicsMap = new Map(existingTopics?.map(t => [t.name.toLowerCase(), t]) || []);

      const topicsToUpdate: any[] = [];
      const topicsToInsert: any[] = [];

      for (const topic of topicsToSave) {
        const existing = existingTopicsMap.get(topic.name.toLowerCase());
        if (existing) {
          topicsToUpdate.push({
            id: existing.id,
            name: topic.name,
            volume: topic.volume,
            url: topic.url || existing.url,
            category: topic.category || existing.category,
            created_at: existing.created_at,
          });
        } else {
          topicsToInsert.push({
            name: topic.name,
            volume: topic.volume,
            url: topic.url,
            category: topic.category,
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

      if (topicsToInsert.length > 0) {
        const { error } = await supabase
          .from('trending_topics')
          .insert(topicsToInsert);

        if (error) throw error;
      }

      const { data: historyTopics, error: historyFetchError } = await supabase
        .from('trending_topics')
        .select('*');

      if (historyFetchError) throw historyFetchError;

      if (historyTopics && historyTopics.length > 0) {
        const historySnapshots = historyTopics.map(topic => ({
          topic_id: topic.id,
          topic_name: topic.name,
          volume: topic.volume,
          category: topic.category,
        }));

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
            <h1 className="text-2xl md:text-3xl font-bold text-center">Admin Dashboard</h1>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-xs md:text-sm text-center mt-1 md:mt-2`}>
              Manage trending topics and backups
            </p>
          </div>
          <div className="flex gap-2 md:gap-3">
            <button
              onClick={onViewPublic}
              className={`px-3 md:px-4 py-1.5 md:py-2 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} rounded-lg transition-colors text-xs md:text-sm font-medium text-white flex items-center gap-2`}
            >
              <Eye size={16} />
              View
            </button>
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
              className={`px-3 md:px-4 py-1.5 md:py-2 ${theme === 'dark' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-amber-500 hover:bg-amber-600'} rounded-lg transition-colors text-xs md:text-sm font-medium text-white`}
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

        <div className="max-w-7xl mx-auto mt-6">
          <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border shadow-sm p-6`}>
            <h2 className="text-xl font-bold mb-4">Current Topics ({topics.length})</h2>
            {loading ? (
              <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading...
              </div>
            ) : (
              <div className={`${theme === 'dark' ? 'bg-gray-750' : 'bg-gray-50'} rounded-lg p-4`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {topics.slice(0, 50).map((topic, index) => (
                    <div
                      key={index}
                      className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-3 rounded border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-xs font-medium`}>
                          #{index + 1}
                        </span>
                        <span className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} text-xs font-medium`}>
                          {topic.searchVolume.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-medium">{topic.name}</div>
                      {topic.category && (
                        <div className="mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                            {topic.category}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {topics.length > 50 && (
                  <div className={`text-center mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
                    ... and {topics.length - 50} more topics
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
