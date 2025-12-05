import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { FAQ } from '../types';

interface FAQManagerProps {
  pageId: string;
  theme: 'dark' | 'light';
}

export default function FAQManager({ pageId, theme }: FAQManagerProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');

  useEffect(() => {
    if (pageId) {
      loadFAQs();
    }
  }, [pageId]);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('page_id', pageId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setFaqs(data || []);
    } catch (err: any) {
      console.error('Error loading FAQs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addFAQ = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      setError('Question and answer are required');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in');

      const maxOrder = faqs.length > 0 ? Math.max(...faqs.map(f => f.order_index)) : -1;

      const { error } = await supabase
        .from('faqs')
        .insert([{
          page_id: pageId,
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
          order_index: maxOrder + 1,
          user_id: user.id
        }]);

      if (error) throw error;

      setNewQuestion('');
      setNewAnswer('');
      setError('');
      await loadFAQs();
    } catch (err: any) {
      console.error('Error adding FAQ:', err);
      setError(err.message);
    }
  };

  const updateFAQ = async (id: string) => {
    if (!editQuestion.trim() || !editAnswer.trim()) {
      setError('Question and answer are required');
      return;
    }

    try {
      const { error } = await supabase
        .from('faqs')
        .update({
          question: editQuestion.trim(),
          answer: editAnswer.trim()
        })
        .eq('id', id);

      if (error) throw error;

      setEditingId(null);
      setEditQuestion('');
      setEditAnswer('');
      setError('');
      await loadFAQs();
    } catch (err: any) {
      console.error('Error updating FAQ:', err);
      setError(err.message);
    }
  };

  const deleteFAQ = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;

    try {
      const { error } = await supabase
        .from('faqs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadFAQs();
    } catch (err: any) {
      console.error('Error deleting FAQ:', err);
      setError(err.message);
    }
  };

  const moveFAQ = async (id: string, direction: 'up' | 'down') => {
    const index = faqs.findIndex(f => f.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === faqs.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newFaqs = [...faqs];
    [newFaqs[index], newFaqs[newIndex]] = [newFaqs[newIndex], newFaqs[index]];

    try {
      const updates = newFaqs.map((faq, idx) => ({
        id: faq.id,
        order_index: idx
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('faqs')
          .update({ order_index: update.order_index })
          .eq('id', update.id);

        if (error) throw error;
      }

      await loadFAQs();
    } catch (err: any) {
      console.error('Error reordering FAQs:', err);
      setError(err.message);
    }
  };

  const startEdit = (faq: FAQ) => {
    setEditingId(faq.id);
    setEditQuestion(faq.question);
    setEditAnswer(faq.answer);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditQuestion('');
    setEditAnswer('');
  };

  if (loading) {
    return <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading FAQs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold mb-1">Frequently Asked Questions</h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Add FAQ items to display on this page
          </p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
          {faqs.length} FAQ{faqs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <div className="p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg text-red-500 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <div
            key={faq.id}
            className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
          >
            {editingId === faq.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editQuestion}
                  onChange={(e) => setEditQuestion(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="Question"
                />
                <textarea
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="Answer"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => updateFAQ(faq.id)}
                    className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className={`px-3 py-1 text-xs font-medium rounded-lg ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1 mt-1">
                    <button
                      onClick={() => moveFAQ(faq.id, 'up')}
                      disabled={index === 0}
                      className={`p-1 rounded ${index === 0 ? 'opacity-30 cursor-not-allowed' : theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => moveFAQ(faq.id, 'down')}
                      disabled={index === faqs.length - 1}
                      className={`p-1 rounded ${index === faqs.length - 1 ? 'opacity-30 cursor-not-allowed' : theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-sm mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {faq.question}
                    </div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {faq.answer}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(faq)}
                      className={`px-2 py-1 text-xs font-medium rounded ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteFAQ(faq.id)}
                      className="p-1 text-red-500 hover:bg-red-500 hover:bg-opacity-10 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <div className="space-y-3">
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="New FAQ question..."
            className={`w-full px-3 py-2 rounded-lg border text-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
          />
          <textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder="Answer..."
            rows={3}
            className={`w-full px-3 py-2 rounded-lg border text-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
          />
          <button
            onClick={addFAQ}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Plus size={16} />
            Add FAQ
          </button>
        </div>
      </div>
    </div>
  );
}
