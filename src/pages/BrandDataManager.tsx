import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Search, Download, RefreshCw, Filter } from 'lucide-react';

interface BrandKeywordData {
  id: string;
  brand: string;
  keyword: string;
  search_volume: number;
  month: string | null;
  user_id: string;
  created_at: string;
  three_month_change: number | null;
  yoy_change: number | null;
  competition: string | null;
  competition_indexed: number | null;
  Currency: string | null;
  'Avg. monthly searches': number | null;
  'Three month change': string | null;
  'YoY change': string | null;
  'Competition (indexed value)': number | null;
  'Top of page bid (low range)': number | null;
  'Top of page bid (high range)': number | null;
  'Ad impression share': string | null;
  'Organic impression share': string | null;
  'Organic average position': string | null;
  'In account?': string | null;
  'In plan?': string | null;
  Competition: string | null;
  [key: string]: any;
}

export default function BrandDataManager() {
  const [data, setData] = useState<BrandKeywordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [brands, setBrands] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: keywordData, error } = await supabase
        .from('brand_keyword_data')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setData(keywordData || []);

      const uniqueBrands = Array.from(new Set(keywordData?.map(d => d.brand) || []));
      setBrands(uniqueBrands);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const { error } = await supabase
        .from('brand_keyword_data')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setData(data.filter(d => d.id !== id));
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Failed to delete record');
    }
  };

  const handleDeleteBrand = async (brand: string) => {
    if (!confirm(`Are you sure you want to delete all data for "${brand}"?`)) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('brand_keyword_data')
        .delete()
        .eq('brand', brand)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchData();
      setSelectedBrand('all');
    } catch (error) {
      console.error('Error deleting brand:', error);
      alert('Failed to delete brand data');
    }
  };

  const exportToCSV = () => {
    const filteredData = getFilteredData();
    if (filteredData.length === 0) return;

    const allColumns = Object.keys(filteredData[0]);
    const csvHeader = allColumns.join(',');
    const csvRows = filteredData.map(row =>
      allColumns.map(col => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
      }).join(',')
    );

    const csv = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brand-keyword-data-${selectedBrand}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getFilteredData = () => {
    let filtered = [...data];

    if (selectedBrand !== 'all') {
      filtered = filtered.filter(d => d.brand === selectedBrand);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        d.keyword?.toLowerCase().includes(term) ||
        d.brand?.toLowerCase().includes(term)
      );
    }

    filtered.sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (sortDirection === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });

    return filtered;
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getAllColumns = () => {
    if (data.length === 0) return [];

    const priorityColumns = [
      'brand',
      'keyword',
      'Currency',
      'Avg. monthly searches',
      'Three month change',
      'YoY change',
      'Competition',
      'Competition (indexed value)',
      'Top of page bid (low range)',
      'Top of page bid (high range)',
    ];

    const monthColumns = Object.keys(data[0])
      .filter(key => key.startsWith('Searches: '))
      .sort();

    const otherColumns = Object.keys(data[0])
      .filter(key =>
        !priorityColumns.includes(key) &&
        !monthColumns.includes(key) &&
        !['id', 'user_id', 'created_at', 'search_volume', 'month', 'three_month_change', 'yoy_change', 'competition', 'competition_indexed'].includes(key)
      );

    return [...priorityColumns, ...monthColumns, ...otherColumns];
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      if (value >= 1000) {
        return value.toLocaleString();
      }
      return value.toString();
    }
    return String(value);
  };

  const filteredData = getFilteredData();
  const columns = getAllColumns();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-[98%] mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Brand Keyword Data Manager</h1>
          <p className="text-gray-600">View and manage all uploaded brand keyword data</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search keywords or brands..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Brands</option>
                {brands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchData}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>

            <button
              onClick={exportToCSV}
              disabled={filteredData.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredData.length}</span> of <span className="font-semibold">{data.length}</span> records
            </p>

            {selectedBrand !== 'all' && (
              <button
                onClick={() => handleDeleteBrand(selectedBrand)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete All {selectedBrand} Data
              </button>
            )}
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">No data found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700 border-r border-gray-200 z-10">
                      Actions
                    </th>
                    {columns.map(column => (
                      <th
                        key={column}
                        onClick={() => handleSort(column)}
                        className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                      >
                        <div className="flex items-center gap-2">
                          {column}
                          {sortColumn === column && (
                            <span className="text-blue-600">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredData.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="sticky left-0 bg-white px-4 py-3 border-r border-gray-200 z-10">
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                      {columns.map(column => (
                        <td key={column} className="px-4 py-3 text-gray-900 whitespace-nowrap">
                          {formatValue(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Column Information</h3>
          <p className="text-sm text-blue-800 mb-2">Total Columns: {columns.length + 4} (including internal fields)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
            <div>
              <strong>Core Fields:</strong> brand, keyword, Currency, Avg. monthly searches
            </div>
            <div>
              <strong>Metrics:</strong> Three month change, YoY change, Competition
            </div>
            <div>
              <strong>Bidding:</strong> Top of page bid (low/high range), Competition indexed
            </div>
            <div>
              <strong>Monthly Data:</strong> {Object.keys(data[0] || {}).filter(k => k.startsWith('Searches:')).length} months tracked
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
