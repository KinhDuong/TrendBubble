import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Loader2 } from 'lucide-react';

interface TrendingTopic {
  id?: string;
  name: string;
  search_volume: number;
  search_volume_raw: string;
  rank: number;
  url: string;
  pub_date: string;
  category: string;
  source: string;
  user_id?: string;
  crypto_data?: any;
}

interface DataEditorProps {
  theme: 'dark' | 'light';
  onClose: () => void;
  existingData?: TrendingTopic;
}

export default function DataEditor({ theme, onClose, existingData }: DataEditorProps) {
  const [formData, setFormData] = useState<TrendingTopic>({
    name: '',
    search_volume: 0,
    search_volume_raw: '0',
    rank: 0,
    url: '',
    pub_date: new Date().toISOString(),
    category: '',
    source: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sources, setSources] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadSourcesAndCategories();
    if (existingData) {
      setFormData({
        name: existingData.name || '',
        search_volume: existingData.search_volume || 0,
        search_volume_raw: existingData.search_volume_raw || '0',
        rank: existingData.rank || 0,
        url: existingData.url || '',
        pub_date: existingData.pub_date || new Date().toISOString(),
        category: existingData.category || '',
        source: existingData.source || '',
      });
    }
  }, [existingData]);

  const loadSourcesAndCategories = async () => {
    try {
      const [sourcesRes, categoriesRes] = await Promise.all([
        supabase.from('custom_sources').select('name').order('name'),
        supabase.from('custom_categories').select('name').order('name'),
      ]);

      if (sourcesRes.data) {
        setSources(sourcesRes.data.map(s => s.name));
      }
      if (categoriesRes.data) {
        setCategories(categoriesRes.data.map(c => c.name));
      }
    } catch (err) {
      console.error('Error loading sources/categories:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const dataToSave = {
        ...formData,
        user_id: user?.id,
        search_volume: Number(formData.search_volume),
        rank: Number(formData.rank),
      };

      if (existingData?.id) {
        const { error: updateError } = await supabase
          .from('trending_topics')
          .update(dataToSave)
          .eq('id', existingData.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('trending_topics')
          .insert(dataToSave);

        if (insertError) throw insertError;
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof TrendingTopic, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-lg ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <div className={`sticky top-0 flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {existingData ? 'Edit Trending Topic' : 'Add Trending Topic'}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Source *
              </label>
              <input
                type="text"
                list="sources-list"
                value={formData.source}
                onChange={(e) => handleChange('source', e.target.value)}
                required
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <datalist id="sources-list">
                {sources.map(source => (
                  <option key={source} value={source} />
                ))}
              </datalist>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Category
              </label>
              <input
                type="text"
                list="categories-list"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <datalist id="categories-list">
                {categories.map(category => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Search Volume *
              </label>
              <input
                type="number"
                value={formData.search_volume}
                onChange={(e) => {
                  const val = e.target.value;
                  handleChange('search_volume', val);
                  handleChange('search_volume_raw', val);
                }}
                required
                min="0"
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Rank *
              </label>
              <input
                type="number"
                value={formData.rank}
                onChange={(e) => handleChange('rank', e.target.value)}
                required
                min="1"
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div className="md:col-span-2">
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                URL
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => handleChange('url', e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Publication Date
              </label>
              <input
                type="datetime-local"
                value={formData.pub_date ? new Date(formData.pub_date).toISOString().slice(0, 16) : ''}
                onChange={(e) => handleChange('pub_date', new Date(e.target.value).toISOString())}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
          </div>

          {error && (
            <div className={`p-3 rounded-lg ${
              theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
            }`}>
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
