import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, X } from 'lucide-react';

interface Source {
  id: string;
  value: string;
  label: string;
  created_at: string;
}

interface SourceManagerProps {
  theme: 'dark' | 'light';
}

export default function SourceManager({ theme }: SourceManagerProps) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [formData, setFormData] = useState({ value: '', label: '' });
  const [errors, setErrors] = useState<{ value?: string; label?: string }>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_sources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSources(data || []);
    } catch (error) {
      console.error('Error loading sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSource(null);
    setFormData({ value: '', label: '' });
    setErrors({});
    setShowEditor(true);
  };

  const handleEdit = (source: Source) => {
    setEditingSource(source);
    setFormData({ value: source.value, label: source.label });
    setErrors({});
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this source?')) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('custom_sources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSources(sources.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting source:', error);
      alert('Failed to delete source');
    } finally {
      setDeletingId(null);
    }
  };

  const validateForm = () => {
    const newErrors: { value?: string; label?: string } = {};

    if (!formData.value.trim()) {
      newErrors.value = 'Value is required';
    } else if (!/^[a-z0-9_]+$/.test(formData.value)) {
      newErrors.value = 'Value must contain only lowercase letters, numbers, and underscores';
    }

    if (!formData.label.trim()) {
      newErrors.label = 'Label is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (editingSource) {
        const { error } = await supabase
          .from('custom_sources')
          .update({
            value: formData.value.trim(),
            label: formData.label.trim(),
          })
          .eq('id', editingSource.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('custom_sources')
          .insert({
            value: formData.value.trim(),
            label: formData.label.trim(),
          });

        if (error) throw error;
      }

      setShowEditor(false);
      loadSources();
    } catch (error: any) {
      console.error('Error saving source:', error);
      if (error.code === '23505') {
        setErrors({ value: 'This value already exists' });
      } else {
        alert('Failed to save source');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
        Loading sources...
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Source Manager
            </h2>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {sources.length} sources
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Source
          </button>
        </div>

        {sources.length === 0 ? (
          <div className={`text-center py-12 ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-600'} rounded-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className="mb-4">No sources found</p>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Add Your First Source
            </button>
          </div>
        ) : (
          <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                      Value
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                      Label
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                      Created
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {sources.map((source) => (
                    <tr
                      key={source.id}
                      className={`${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors`}
                    >
                      <td className={`px-6 py-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        <code className={`px-2 py-1 text-sm rounded ${theme === 'dark' ? 'bg-gray-900 text-blue-400' : 'bg-gray-100 text-blue-600'}`}>
                          {source.value}
                        </code>
                      </td>
                      <td className={`px-6 py-4 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {source.label}
                      </td>
                      <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(source.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(source)}
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                            title="Edit source"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(source.id)}
                            disabled={deletingId === source.id}
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-600'} disabled:opacity-50`}
                            title="Delete source"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full`}>
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {editingSource ? 'Edit Source' : 'Add Source'}
              </h3>
              <button
                onClick={() => setShowEditor(false)}
                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Value
                </label>
                <input
                  type="text"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="e.g., twitter_trends"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    errors.value
                      ? 'border-red-500'
                      : theme === 'dark'
                      ? 'border-gray-600'
                      : 'border-gray-300'
                  } ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-white placeholder-gray-400'
                      : 'bg-white text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  disabled={!!editingSource}
                />
                {errors.value && (
                  <p className="text-red-500 text-sm mt-1">{errors.value}</p>
                )}
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Internal identifier (lowercase, numbers, underscores only)
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Label
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Twitter Trends"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    errors.label
                      ? 'border-red-500'
                      : theme === 'dark'
                      ? 'border-gray-600'
                      : 'border-gray-300'
                  } ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-white placeholder-gray-400'
                      : 'bg-white text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.label && (
                  <p className="text-red-500 text-sm mt-1">{errors.label}</p>
                )}
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Display name shown to users
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
              <button
                onClick={() => setShowEditor(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingSource ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
