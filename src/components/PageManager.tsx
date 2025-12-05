import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, ExternalLink } from 'lucide-react';
import PageEditor from './PageEditor';

interface Page {
  id: string;
  page_url: string;
  source: string;
  meta_title: string;
  meta_description: string;
  summary?: string;
  faq?: string;
  template?: string;
  created_at: string;
}

interface PageManagerProps {
  theme: 'dark' | 'light';
}

export default function PageManager({ theme }: PageManagerProps) {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPages(data || []);
    } catch (error) {
      console.error('Error loading pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPage(undefined);
    setShowEditor(true);
  };

  const handleEdit = (page: Page) => {
    setEditingPage(page);
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPages(pages.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting page:', error);
      alert('Failed to delete page');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setEditingPage(undefined);
    loadPages();
  };

  if (loading) {
    return (
      <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
        Loading pages...
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Page Manager
          </h2>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Create Page
          </button>
        </div>

        {pages.length === 0 ? (
          <div className={`text-center py-12 ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-600'} rounded-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className="mb-4">No pages created yet</p>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Create Your First Page
            </button>
          </div>
        ) : (
          <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                      Title
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                      URL
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                      Source
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                      Summary
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
                  {pages.map((page) => (
                    <tr
                      key={page.id}
                      className={`${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors`}
                    >
                      <td className={`px-6 py-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        <div className="font-medium">{page.meta_title}</div>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} line-clamp-1`}>
                          {page.meta_description}
                        </div>
                      </td>
                      <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        <a
                          href={page.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-600 inline-flex items-center gap-1 text-sm"
                        >
                          {page.page_url}
                          <ExternalLink size={12} />
                        </a>
                      </td>
                      <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className={`px-2 py-1 text-xs rounded ${theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                          {page.source}
                        </span>
                      </td>
                      <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {page.summary ? (
                          <span className={`px-2 py-1 text-xs rounded ${theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                            Yes
                          </span>
                        ) : (
                          <span className={`px-2 py-1 text-xs rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                            No
                          </span>
                        )}
                      </td>
                      <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(page.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(page)}
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                            title="Edit page"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(page.id)}
                            disabled={deletingId === page.id}
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-600'} disabled:opacity-50`}
                            title="Delete page"
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
        <PageEditor
          theme={theme}
          onClose={handleEditorClose}
          existingPage={editingPage}
        />
      )}
    </>
  );
}
