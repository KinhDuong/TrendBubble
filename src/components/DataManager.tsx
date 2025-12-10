import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, ExternalLink, ChevronLeft, ChevronRight, Download, Upload, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import DataEditor from './DataEditor';
import DataFilters, { FilterState } from './DataFilters';

interface TrendingTopic {
  id: string;
  name: string;
  search_volume: number;
  search_volume_raw: string;
  rank: number;
  created_at: string;
  updated_at: string;
  url: string;
  pub_date: string;
  category: string;
  source: string;
}

interface DataManagerProps {
  theme: 'dark' | 'light';
  initialSource?: string;
}

const PAGE_SIZE = 50;

type SortColumn = 'name' | 'search_volume' | 'rank' | 'pub_date' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function DataManager({ theme, initialSource }: DataManagerProps) {
  const [data, setData] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingData, setEditingData] = useState<TrendingTopic | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    source: initialSource || '',
    category: '',
    dateFrom: '',
    dateTo: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    loadData();
  }, [filters, currentPage, sortColumn, sortDirection]);

  const loadData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('trending_topics')
        .select('*', { count: 'exact' });

      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }
      if (filters.source) {
        query = query.eq('source', filters.source);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.dateFrom) {
        query = query.gte('pub_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('pub_date', filters.dateTo);
      }

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: items, error, count } = await query
        .order(sortColumn, { ascending: sortDirection === 'asc' })
        .range(from, to);

      if (error) throw error;

      setData(items || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    const newData = filters.source ? { source: filters.source } : undefined;
    setEditingData(newData as any);
    setShowEditor(true);
  };

  const handleEdit = (item: TrendingTopic) => {
    setEditingData(item);
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('trending_topics')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setData(data.filter(d => d.id !== id));
      setTotalCount(prev => prev - 1);
    } catch (error) {
      console.error('Error deleting data:', error);
      alert('Failed to delete item');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedItems.size} items?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('trending_topics')
        .delete()
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      setSelectedItems(new Set());
      loadData();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      alert('Failed to delete items');
    }
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setEditingData(undefined);
    loadData();
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} className="opacity-40" />;
    }
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === data.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(data.map(d => d.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const exportData = async () => {
    try {
      const { data: allData, error } = await supabase
        .from('trending_topics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const csv = [
        ['Name', 'Source', 'Category', 'Search Volume', 'Rank', 'URL', 'Pub Date'].join(','),
        ...(allData || []).map(item => [
          `"${item.name}"`,
          item.source,
          item.category,
          item.search_volume,
          item.rank,
          item.url,
          item.pub_date,
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trending-topics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data');
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading && data.length === 0) {
    return (
      <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
        Loading data...
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Data Manager
            </h2>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {totalCount} total items
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedItems.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Trash2 size={18} />
                Delete ({selectedItems.size})
              </button>
            )}
            <button
              onClick={exportData}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              <Download size={18} />
              Export
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Add Item
            </button>
          </div>
        </div>

        <DataFilters
          theme={theme}
          onFilterChange={handleFilterChange}
          initialFilters={initialSource ? { source: initialSource } : undefined}
        />

        {data.length === 0 ? (
          <div className={`text-center py-12 ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-600'} rounded-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className="mb-4">No data found</p>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Add Your First Item
            </button>
          </div>
        ) : (
          <>
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedItems.size === data.length && data.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded"
                        />
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-2">
                          Name
                          <SortIcon column="name" />
                        </div>
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                        Source
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                        Category
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                        onClick={() => handleSort('search_volume')}
                      >
                        <div className="flex items-center gap-2">
                          Volume
                          <SortIcon column="search_volume" />
                        </div>
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                        onClick={() => handleSort('rank')}
                      >
                        <div className="flex items-center gap-2">
                          Rank
                          <SortIcon column="rank" />
                        </div>
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                        onClick={() => handleSort('pub_date')}
                      >
                        <div className="flex items-center gap-2">
                          Date
                          <SortIcon column="pub_date" />
                        </div>
                      </th>
                      <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {data.map((item) => (
                      <tr
                        key={item.id}
                        className={`${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors`}
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={() => toggleSelectItem(item.id)}
                            className="rounded"
                          />
                        </td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          <div className="font-medium">{item.name}</div>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:text-blue-600 inline-flex items-center gap-1 mt-1"
                            >
                              View
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          <span className={`px-2 py-1 text-xs rounded ${theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                            {item.source}
                          </span>
                        </td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {item.category && (
                            <span className={`px-2 py-1 text-xs rounded ${theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                              {item.category}
                            </span>
                          )}
                        </td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {item.search_volume.toLocaleString()}
                        </td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          #{item.rank}
                        </td>
                        <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {item.pub_date ? new Date(item.pub_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                              title="Edit item"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                              className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-600'} disabled:opacity-50`}
                              title="Delete item"
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                      theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className={`px-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                      theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showEditor && (
        <DataEditor
          theme={theme}
          onClose={handleEditorClose}
          existingData={editingData}
        />
      )}
    </>
  );
}
