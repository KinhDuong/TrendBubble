import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import { supabase } from '../lib/supabase';
import { X, Save, Plus, Code, Eye } from 'lucide-react';
import 'quill/dist/quill.snow.css';

interface Page {
  id: string;
  page_url: string;
  source: string;
  meta_title: string;
  meta_description: string;
  intro_text?: string;
  summary?: string;
  template?: string;
  faq?: string;
  created_at: string;
}

interface PageEditorProps {
  theme: 'dark' | 'light';
  onClose: () => void;
  existingPage?: Page;
}

export default function PageEditor({ theme, onClose, existingPage }: PageEditorProps) {
  const [pageUrl, setPageUrl] = useState(existingPage?.page_url || '');
  const [source, setSource] = useState(existingPage?.source || 'google_trends');
  const [metaTitle, setMetaTitle] = useState(existingPage?.meta_title || '');
  const [metaDescription, setMetaDescription] = useState(existingPage?.meta_description || '');
  const [introText, setIntroText] = useState(existingPage?.intro_text || '');
  const [summary, setSummary] = useState(existingPage?.summary || '');
  const [faq, setFaq] = useState(existingPage?.faq || '');
  const [template, setTemplate] = useState(existingPage?.template || 'default');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sources, setSources] = useState<Array<{ value: string; label: string }>>([]);
  const [faqEditorMode, setFaqEditorMode] = useState<'visual' | 'html'>('visual');

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_sources')
        .select('value, label')
        .order('label');

      if (error) throw error;

      const defaultSources = [
        { value: 'google_trends', label: 'Google Trends' },
        { value: 'user_upload', label: 'User Upload' },
        { value: 'all', label: 'All' }
      ];

      if (data) {
        setSources([...defaultSources, ...data]);
      } else {
        setSources(defaultSources);
      }
    } catch (error) {
      console.error('Error loading sources:', error);
      setSources([
        { value: 'google_trends', label: 'Google Trends' },
        { value: 'user_upload', label: 'User Upload' }
      ]);
    }
  };


  const handleSave = async () => {
    if (!pageUrl || !metaTitle || !metaDescription) {
      setError('Page URL, Title, and Description are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let formattedUrl = pageUrl.trim();
      if (!formattedUrl.startsWith('/')) {
        formattedUrl = '/' + formattedUrl;
      }

      const pageData = {
        page_url: formattedUrl,
        source,
        meta_title: metaTitle,
        meta_description: metaDescription,
        intro_text: introText || null,
        summary: summary || null,
        faq: faq || null,
        template: template || 'default'
      };

      if (existingPage) {
        const { error } = await supabase
          .from('pages')
          .update(pageData)
          .eq('id', existingPage.id);

        if (error) throw error;
      } else {
        // Get current user for new page creation
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('You must be logged in to create a page');
        }

        const { error } = await supabase
          .from('pages')
          .insert([{ ...pageData, user_id: user.id }]);

        if (error) throw error;
      }

      onClose();
    } catch (err: any) {
      console.error('Error saving page:', err);
      setError(err.message || 'Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link'],
      ['blockquote', 'code-block'],
      [{ 'color': [] }, { 'background': [] }],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'align',
    'link',
    'blockquote', 'code-block',
    'color', 'background'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className={`${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className={`flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className="text-xl font-bold flex items-center gap-2">
            {existingPage ? 'Edit Page' : <><Plus size={20} /> Create New Page</>}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Page URL *
              </label>
              <input
                type="text"
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                placeholder="/my-page-url"
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Example: /best-crypto-to-buy-now
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Source *
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                {sources.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Meta Title *
              </label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Page Title"
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Meta Description *
              </label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Brief description for SEO"
                rows={3}
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Intro Text
              </label>
              <textarea
                value={introText}
                onChange={(e) => setIntroText(e.target.value)}
                placeholder="Custom introduction text to display above the ranking list"
                rows={3}
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Optional text to display in the full ranking section
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Template
              </label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="default">Default</option>
                <option value="crypto">Crypto</option>
                <option value="trending">Trending</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Summary (HTML/CSS)
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="<div><style>.my-class { color: blue; }</style><h2>Your HTML content here</h2></div>"
                rows={15}
                className={`w-full px-3 py-2 rounded-lg border font-mono text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-900 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Enter raw HTML/CSS code. It will be rendered exactly as provided.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  FAQ (Optional)
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setFaqEditorMode('visual')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      faqEditorMode === 'visual'
                        ? theme === 'dark'
                          ? 'bg-gray-900 text-white'
                          : 'bg-white text-gray-900 shadow-sm'
                        : theme === 'dark'
                        ? 'text-gray-400 hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Eye size={14} />
                    Visual
                  </button>
                  <button
                    type="button"
                    onClick={() => setFaqEditorMode('html')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      faqEditorMode === 'html'
                        ? theme === 'dark'
                          ? 'bg-gray-900 text-white'
                          : 'bg-white text-gray-900 shadow-sm'
                        : theme === 'dark'
                        ? 'text-gray-400 hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Code size={14} />
                    HTML
                  </button>
                </div>
              </div>

              {faqEditorMode === 'visual' ? (
                <div className={`${theme === 'dark' ? 'quill-dark' : ''}`}>
                  <ReactQuill
                    theme="snow"
                    value={faq}
                    onChange={setFaq}
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['link'],
                        ['clean']
                      ]
                    }}
                    formats={['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'link']}
                    placeholder="Write your FAQ content here..."
                    className={`${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'} rounded-lg`}
                    style={{ height: '200px', marginBottom: '50px' }}
                  />
                </div>
              ) : (
                <textarea
                  value={faq}
                  onChange={(e) => setFaq(e.target.value)}
                  placeholder="<p>Paste or write HTML here...</p>"
                  rows={10}
                  className={`w-full px-3 py-2 rounded-lg border font-mono text-sm ${
                    theme === 'dark'
                      ? 'bg-gray-900 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              )}
            </div>
          </div>
        </div>

        <div className={`flex items-center justify-end gap-3 p-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Page'}
          </button>
        </div>
      </div>

      <style>{`
        /* Quill Toolbar Styling */
        .ql-toolbar {
          border-radius: 0.5rem 0.5rem 0 0 !important;
          padding: 0.75rem !important;
        }

        .ql-container {
          border-radius: 0 0 0.5rem 0.5rem !important;
          font-family: inherit !important;
        }

        .ql-editor {
          min-height: 300px !important;
          font-size: 1rem !important;
          line-height: 1.75 !important;
        }

        /* Dark Theme */
        .quill-dark .ql-toolbar {
          background-color: #1f2937 !important;
          border-color: #374151 !important;
        }

        .quill-dark .ql-container {
          background-color: #111827 !important;
          border-color: #374151 !important;
        }

        .quill-dark .ql-editor {
          color: #fff !important;
        }

        .quill-dark .ql-editor.ql-blank::before {
          color: #6b7280 !important;
          font-style: italic !important;
        }

        .quill-dark .ql-stroke {
          stroke: #d1d5db !important;
        }

        .quill-dark .ql-fill {
          fill: #d1d5db !important;
        }

        .quill-dark .ql-picker-label {
          color: #d1d5db !important;
        }

        .quill-dark .ql-picker-options {
          background-color: #1f2937 !important;
          border-color: #374151 !important;
        }

        .quill-dark .ql-picker-item {
          color: #d1d5db !important;
        }

        .quill-dark .ql-picker-item:hover {
          color: #60a5fa !important;
        }

        .quill-dark .ql-active {
          color: #60a5fa !important;
        }

        .quill-dark .ql-active .ql-stroke {
          stroke: #60a5fa !important;
        }

        .quill-dark .ql-active .ql-fill {
          fill: #60a5fa !important;
        }

        /* Light Theme */
        .ql-toolbar {
          background-color: #f9fafb !important;
          border-color: #d1d5db !important;
        }

        .ql-container {
          background-color: #ffffff !important;
          border-color: #d1d5db !important;
        }

        /* Toolbar buttons */
        .ql-toolbar button:hover,
        .ql-toolbar button:focus {
          color: #2563eb !important;
        }

        .ql-toolbar button:hover .ql-stroke,
        .ql-toolbar button:focus .ql-stroke {
          stroke: #2563eb !important;
        }

        .ql-toolbar button:hover .ql-fill,
        .ql-toolbar button:focus .ql-fill {
          fill: #2563eb !important;
        }
      `}</style>
    </div>
  );
}
