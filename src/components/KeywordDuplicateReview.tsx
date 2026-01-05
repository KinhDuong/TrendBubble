import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Copy, TrendingDown, ArrowRight, Loader2 } from 'lucide-react';

interface DuplicateGroup {
  id: string;
  keywords: string[];
  sharedData: any;
}

interface ZeroTrafficKeyword {
  keyword: string;
  data: any;
}

interface KeywordDuplicateReviewProps {
  duplicateGroups: DuplicateGroup[];
  zeroTrafficKeywords: ZeroTrafficKeyword[];
  allData: Array<Record<string, any>>;
  onContinue: (filteredData: Array<Record<string, any>>) => void;
  onCancel: () => void;
  theme: 'dark' | 'light';
}

export default function KeywordDuplicateReview({
  duplicateGroups,
  zeroTrafficKeywords,
  allData,
  onContinue,
  onCancel,
  theme,
}: KeywordDuplicateReviewProps) {
  // For each duplicate group, track which keyword to keep (null means keep all)
  const [selectedKeywords, setSelectedKeywords] = useState<Record<string, string | null>>({});

  // Track which zero-traffic keywords to exclude
  const [excludedZeroTraffic, setExcludedZeroTraffic] = useState<Set<string>>(
    new Set(zeroTrafficKeywords.map(k => k.keyword))
  );

  // Track processing state
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize all duplicate groups with first keyword auto-selected
  useEffect(() => {
    const initial: Record<string, string | null> = {};
    duplicateGroups.forEach(group => {
      initial[group.id] = group.keywords[0]; // Auto-select first keyword
    });
    setSelectedKeywords(initial);
  }, [duplicateGroups]);

  const handleDuplicateSelection = (groupId: string, keyword: string | null) => {
    setSelectedKeywords(prev => ({
      ...prev,
      [groupId]: keyword
    }));
  };

  const toggleZeroTrafficKeyword = (keyword: string) => {
    setExcludedZeroTraffic(prev => {
      const next = new Set(prev);
      if (next.has(keyword)) {
        next.delete(keyword);
      } else {
        next.add(keyword);
      }
      return next;
    });
  };

  const toggleAllZeroTraffic = () => {
    if (excludedZeroTraffic.size === zeroTrafficKeywords.length) {
      setExcludedZeroTraffic(new Set());
    } else {
      setExcludedZeroTraffic(new Set(zeroTrafficKeywords.map(k => k.keyword)));
    }
  };

  const handleContinue = () => {
    setIsProcessing(true);

    // Use setTimeout to allow UI to update before heavy processing
    setTimeout(() => {
      let filtered = [...allData];

      // Process duplicate groups: store variants in search_variants, then remove non-selected
      duplicateGroups.forEach(group => {
        const selected = selectedKeywords[group.id];

        // Safety check: if no selection, default to first keyword
        if (!selected) {
          console.warn(`No selection for group ${group.id}, defaulting to first keyword`);
          return;
        }

        // Get non-selected keywords (the variants to store)
        const variants = group.keywords.filter(k => k !== selected);

        // Find the selected keyword's record and add search_variants
        const selectedRecord = filtered.find(record => record.keyword === selected);
        if (selectedRecord && variants.length > 0) {
          selectedRecord.search_variants = variants.join(', ');
          console.log(`Added variants to "${selected}": ${variants.join(', ')}`);
        }

        // Remove non-selected keywords from the data
        const beforeCount = filtered.length;
        filtered = filtered.filter(record => !variants.includes(record.keyword));
        const afterCount = filtered.length;
        console.log(`Removed ${beforeCount - afterCount} duplicate keywords from group ${group.id}`);
      });

      // Filter out excluded zero-traffic keywords
      const beforeZeroFilter = filtered.length;
      filtered = filtered.filter(record => !excludedZeroTraffic.has(record.keyword));
      const afterZeroFilter = filtered.length;
      console.log(`Filtered out ${beforeZeroFilter - afterZeroFilter} zero-traffic keywords`);

      console.log(`Final filtered data: ${filtered.length} keywords`);
      onContinue(filtered);
    }, 100);
  };

  const totalIssues = duplicateGroups.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`${
          theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        } rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-6 h-6 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <h2 className="text-2xl font-bold">Review Data Quality Issues</h2>
          </div>
          <button
            onClick={onCancel}
            className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary */}
          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'} mt-0.5 flex-shrink-0`} />
              <div className={`text-sm ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-800'}`}>
                <p className="font-semibold mb-1">Found {totalIssues} duplicate group{totalIssues !== 1 ? 's' : ''}</p>
                <p>
                  Review the duplicate keywords below. The first option in each group is auto-selected. Adjust your selections if needed, then click "Next" to proceed to the merge review step.
                </p>
              </div>
            </div>
          </div>

          {/* Duplicate Groups */}
          {duplicateGroups.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Copy className={`w-5 h-5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                <h3 className="text-lg font-semibold">
                  Duplicate Data ({duplicateGroups.length} group{duplicateGroups.length !== 1 ? 's' : ''})
                </h3>
              </div>

              {duplicateGroups.map((group) => (
                <div
                  key={group.id}
                  className={`rounded-lg border p-4 ${
                    theme === 'dark'
                      ? 'border-red-700 bg-red-900/10'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="mb-3">
                    <span className="font-semibold">Group {group.id}</span>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                      These keywords have identical search data. Select which one to keep.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {group.keywords.map((keyword) => (
                      <label
                        key={keyword}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedKeywords[group.id] === keyword
                            ? theme === 'dark'
                              ? 'bg-blue-900/30 border-2 border-blue-500'
                              : 'bg-blue-50 border-2 border-blue-500'
                            : theme === 'dark'
                            ? 'bg-gray-700/50 border-2 border-transparent hover:bg-gray-700'
                            : 'bg-white border-2 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`duplicate-group-${group.id}`}
                          checked={selectedKeywords[group.id] === keyword}
                          onChange={() => handleDuplicateSelection(group.id, keyword)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="flex-1">{keyword}</span>
                        {selectedKeywords[group.id] === keyword && (
                          <span className={`text-xs font-medium ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                            SELECTED
                          </span>
                        )}
                      </label>
                    ))}
                  </div>

                  <div className={`mt-3 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} p-3 rounded ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100'}`}>
                    <div className="font-semibold mb-1">Shared data:</div>
                    <div className="grid grid-cols-2 gap-2">
                      {group.sharedData['Avg. monthly searches'] !== undefined && (
                        <div>Avg. monthly searches: {group.sharedData['Avg. monthly searches'].toLocaleString()}</div>
                      )}
                      {group.sharedData['Competition (indexed value)'] !== undefined && (
                        <div>Competition: {group.sharedData['Competition (indexed value)']}</div>
                      )}
                      {group.sharedData['Top of page bid (low range)'] !== undefined && (
                        <div>Bid (low): ${group.sharedData['Top of page bid (low range)']}</div>
                      )}
                      {group.sharedData['Top of page bid (high range)'] !== undefined && (
                        <div>Bid (high): ${group.sharedData['Top of page bid (high range)']}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Zero Traffic Keywords */}
          {zeroTrafficKeywords.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingDown className={`w-5 h-5 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
                <h3 className="text-lg font-semibold">
                  Zero-Traffic Keywords ({zeroTrafficKeywords.length} found)
                </h3>
              </div>

              <div
                className={`rounded-lg border p-4 ${
                  theme === 'dark'
                    ? 'border-orange-700 bg-orange-900/10'
                    : 'border-orange-200 bg-orange-50'
                }`}
              >
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
                  These keywords have zero or no average monthly searches. They won't generate traffic and may clutter your data.
                </p>

                <label
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer mb-4 ${
                    theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={excludedZeroTraffic.size === zeroTrafficKeywords.length}
                    onChange={toggleAllZeroTraffic}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="font-medium">
                    {excludedZeroTraffic.size === zeroTrafficKeywords.length
                      ? 'Uncheck all'
                      : 'Exclude all zero-traffic keywords'}
                  </span>
                </label>

                <div className={`space-y-1 max-h-60 overflow-y-auto p-2 rounded ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100'}`}>
                  {zeroTrafficKeywords.map((item) => (
                    <label
                      key={item.keyword}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer text-sm ${
                        theme === 'dark'
                          ? 'hover:bg-gray-700'
                          : 'hover:bg-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={excludedZeroTraffic.has(item.keyword)}
                        onChange={() => toggleZeroTrafficKeyword(item.keyword)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="flex-1">{item.keyword}</span>
                      <span className={`text-xs ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                        0 traffic
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between p-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <span>Step 1: Review Duplicates</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className={`px-6 py-2 rounded-lg transition-colors ${
                isProcessing
                  ? 'bg-gray-400 cursor-not-allowed opacity-50'
                  : theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleContinue}
              disabled={isProcessing}
              className={`px-8 py-2.5 rounded-lg transition-colors flex items-center gap-2 font-medium ${
                isProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isProcessing ? (
                <>
                  Processing
                  <Loader2 className="w-5 h-5 animate-spin" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
