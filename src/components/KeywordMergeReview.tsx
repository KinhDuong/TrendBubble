import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { X, GitMerge, AlertCircle } from 'lucide-react';

interface BrandKeywordData {
  id: string;
  brand: string;
  keyword: string;
  search_volume: number;
  user_id: string;
  created_at: string;
  competition: string | null;
  ai_category: string | null;
  ai_insights: string | null;
  sentiment: number | null;
  is_branded: string | null;
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
  [key: string]: any;
}

interface KeywordMergeReviewProps {
  selectedIds: string[];
  data: BrandKeywordData[];
  theme: 'dark' | 'light';
  onClose: () => void;
  onMergeComplete: () => void;
}

export default function KeywordMergeReview({
  selectedIds,
  data,
  theme,
  onClose,
  onMergeComplete,
}: KeywordMergeReviewProps) {
  const selectedKeywords = useMemo(
    () => data.filter(d => selectedIds.includes(d.id)),
    [data, selectedIds]
  );

  const [primaryKeywordId, setPrimaryKeywordId] = useState<string>(selectedIds[0]);
  const [mergedKeywordName, setMergedKeywordName] = useState<string>(
    selectedKeywords[0]?.keyword || ''
  );
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryKeyword = useMemo(
    () => selectedKeywords.find(k => k.id === primaryKeywordId),
    [selectedKeywords, primaryKeywordId]
  );

  const aggregatedData = useMemo(() => {
    const avgMonthlySearches = selectedKeywords.reduce(
      (sum, k) => sum + (k['Avg. monthly searches'] || 0),
      0
    );

    const monthlySearchColumns = Object.keys(selectedKeywords[0] || {})
      .filter(key => key.startsWith('Searches: '));

    const aggregatedMonthly: { [key: string]: number } = {};
    monthlySearchColumns.forEach(col => {
      aggregatedMonthly[col] = selectedKeywords.reduce(
        (sum, k) => sum + (k[col] || 0),
        0
      );
    });

    return {
      avgMonthlySearches,
      monthlySearches: aggregatedMonthly,
    };
  }, [selectedKeywords]);

  const handleMerge = async () => {
    if (!primaryKeyword || !mergedKeywordName.trim()) {
      setError('Please enter a keyword name');
      return;
    }

    setMerging(true);
    setError(null);

    try {
      const mergedData: any = {
        ...primaryKeyword,
        keyword: mergedKeywordName.trim(),
        'Avg. monthly searches': aggregatedData.avgMonthlySearches,
      };

      Object.keys(aggregatedData.monthlySearches).forEach(col => {
        mergedData[col] = aggregatedData.monthlySearches[col];
      });

      const { error: updateError } = await supabase
        .from('brand_keyword_data')
        .update(mergedData)
        .eq('id', primaryKeywordId);

      if (updateError) throw updateError;

      const idsToDelete = selectedIds.filter(id => id !== primaryKeywordId);
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('brand_keyword_data')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) throw deleteError;
      }

      onMergeComplete();
    } catch (err: any) {
      console.error('Error merging keywords:', err);
      setError(err.message || 'Failed to merge keywords');
      setMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`${
          theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        } rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <GitMerge className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold">Merge Keywords</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-lg mb-3">Selected Keywords ({selectedKeywords.length})</h3>
            <div className="space-y-2">
              {selectedKeywords.map(kw => (
                <div
                  key={kw.id}
                  className={`p-3 rounded-lg border ${
                    primaryKeywordId === kw.id
                      ? 'border-blue-500 bg-blue-50'
                      : theme === 'dark'
                      ? 'border-gray-700 bg-gray-900'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="primaryKeyword"
                        checked={primaryKeywordId === kw.id}
                        onChange={() => setPrimaryKeywordId(kw.id)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div>
                        <p className="font-medium">{kw.keyword}</p>
                        <p className="text-sm text-gray-500">
                          Avg. Monthly: {(kw['Avg. monthly searches'] || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {primaryKeywordId === kw.id && (
                      <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Select the primary keyword to keep its metadata (category, sentiment, insights, etc.)
            </p>
          </div>

          <div>
            <label className="block font-semibold mb-2">Merged Keyword Name</label>
            <input
              type="text"
              value={mergedKeywordName}
              onChange={(e) => setMergedKeywordName(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg ${
                theme === 'dark'
                  ? 'bg-gray-900 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder="Enter the merged keyword name"
            />
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">Aggregated Data</h3>
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Avg. Monthly Searches</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {aggregatedData.avgMonthlySearches.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Keywords Being Merged</p>
                  <p className="text-2xl font-bold">{selectedKeywords.length}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Monthly Search Volumes (Sample)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {Object.entries(aggregatedData.monthlySearches)
                    .slice(0, 8)
                    .map(([month, value]) => (
                      <div key={month} className="flex justify-between">
                        <span className="text-gray-500">{month.replace('Searches: ', '')}:</span>
                        <span className="font-semibold">{value.toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">What will happen:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>The primary keyword will be updated with the merged data</li>
                  <li>All monthly search volumes will be summed together</li>
                  <li>The primary keyword&apos;s metadata (category, sentiment, insights) will be preserved</li>
                  <li>All other selected keywords will be deleted</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={merging}
            className={`px-4 py-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={merging || !mergedKeywordName.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {merging ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <GitMerge className="w-4 h-4" />
                Merge Keywords
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
