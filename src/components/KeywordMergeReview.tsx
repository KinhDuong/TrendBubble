import React, { useState, useMemo } from 'react';
import { X, GitMerge, AlertCircle, Check } from 'lucide-react';

interface MergeGroup {
  id: string;
  primaryKeyword: string;
  variants: string[];
  mergedData: any;
  originalData: any[];
}

interface KeywordMergeReviewProps {
  mergeGroups: MergeGroup[];
  onApprove: (approvedMerges: MergeGroup[]) => void;
  onCancel: () => void;
  theme: 'dark' | 'light';
  brandName: string;
}

export default function KeywordMergeReview({
  mergeGroups,
  onApprove,
  onCancel,
  theme,
  brandName,
}: KeywordMergeReviewProps) {
  const [selectedMerges, setSelectedMerges] = useState<Set<string>>(
    new Set(mergeGroups.map(g => g.id))
  );

  const [selectedVariants, setSelectedVariants] = useState<Map<string, Set<string>>>(
    new Map(mergeGroups.map(g => [g.id, new Set(g.variants)]))
  );

  const toggleMerge = (id: string) => {
    const newSet = new Set(selectedMerges);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedMerges(newSet);
  };

  const toggleVariant = (groupId: string, variant: string) => {
    const newMap = new Map(selectedVariants);
    const variantSet = new Set(newMap.get(groupId) || []);

    if (variantSet.has(variant)) {
      variantSet.delete(variant);
    } else {
      variantSet.add(variant);
    }

    newMap.set(groupId, variantSet);
    setSelectedVariants(newMap);

    if (variantSet.size < 2) {
      const newSelectedMerges = new Set(selectedMerges);
      newSelectedMerges.delete(groupId);
      setSelectedMerges(newSelectedMerges);
    } else if (!selectedMerges.has(groupId)) {
      const newSelectedMerges = new Set(selectedMerges);
      newSelectedMerges.add(groupId);
      setSelectedMerges(newSelectedMerges);
    }
  };

  const handleApprove = () => {
    const approvedMerges = mergeGroups
      .filter(g => selectedMerges.has(g.id))
      .map(group => {
        const selectedVars = selectedVariants.get(group.id) || new Set();
        const filteredOriginalData = group.originalData.filter(d => selectedVars.has(d.keyword));

        if (filteredOriginalData.length < 2) {
          return null;
        }

        // Preserve the original primaryKeyword logic from detection:
        // 1. If a keyword matches brand name (case-insensitive), use that
        // 2. Otherwise, use highest search volume
        // 3. Only recalculate if variants were modified
        const brandLower = brandName.trim().toLowerCase();
        const exactBrandMatch = filteredOriginalData.find(s =>
          s.keyword.toLowerCase() === brandLower
        );

        const highestVolumeKeyword = filteredOriginalData.reduce((highest, current) => {
          const currentVolume = current['Avg. monthly searches'] || 0;
          const highestVolume = highest['Avg. monthly searches'] || 0;
          return currentVolume > highestVolume ? current : highest;
        });

        // If user unchecked the original primary keyword, we need to pick a new one
        const originalPrimaryStillSelected = Array.from(selectedVars).includes(group.primaryKeyword);

        let primaryKeyword: string;
        if (!originalPrimaryStillSelected) {
          // User removed the original primary, pick new one with same logic
          primaryKeyword = (exactBrandMatch ? exactBrandMatch : highestVolumeKeyword).keyword;
        } else if (exactBrandMatch) {
          // Brand match exists and is selected - always use it
          primaryKeyword = exactBrandMatch.keyword;
        } else {
          // No brand match, use highest volume
          primaryKeyword = highestVolumeKeyword.keyword;
        }

        const mergedData: any = {
          keyword: primaryKeyword,
          brand: filteredOriginalData[0].brand
        };

        const numericFields = new Set<string>();
        filteredOriginalData.forEach(item => {
          Object.keys(item).forEach(key => {
            if (typeof item[key] === 'number' && !['user_id'].includes(key)) {
              numericFields.add(key);
            }
          });
        });

        const fieldsToAverage = new Set([
          'YoY change',
          'Three month change',
          'Competition (indexed value)',
          'Top of page bid (low range)',
          'Top of page bid (high range)'
        ]);

        numericFields.forEach(field => {
          if (fieldsToAverage.has(field)) {
            const validValues = filteredOriginalData
              .map(item => item[field])
              .filter(v => v !== undefined && v !== null && !isNaN(v));

            if (validValues.length > 0) {
              mergedData[field] = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
            }
          } else {
            mergedData[field] = filteredOriginalData.reduce((sum, item) => sum + (item[field] || 0), 0);
          }
        });

        Object.keys(filteredOriginalData[0]).forEach(key => {
          if (!numericFields.has(key) && !['keyword', 'brand', 'user_id', 'created_at'].includes(key)) {
            const nonZeroValues = filteredOriginalData
              .map(item => item[key])
              .filter(v => v !== undefined && v !== null && v !== '' && v !== 0);

            if (nonZeroValues.length > 0) {
              if (typeof nonZeroValues[0] === 'number') {
                mergedData[key] = Math.max(...nonZeroValues);
              } else {
                mergedData[key] = nonZeroValues[0];
              }
            }
          }
        });

        return {
          ...group,
          primaryKeyword,
          variants: Array.from(selectedVars),
          mergedData,
          originalData: filteredOriginalData
        };
      })
      .filter(g => g !== null) as MergeGroup[];

    onApprove(approvedMerges);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`${
          theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        } rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col`}
      >
        <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <GitMerge className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            <h2 className="text-2xl font-bold">Review Keyword Merges</h2>
          </div>
          <button
            onClick={onCancel}
            className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} mt-0.5 flex-shrink-0`} />
              <div className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-800'}`}>
                <p className="font-semibold mb-1">Similar keywords detected</p>
                <p className="mb-2">We found {mergeGroups.length} groups of similar keywords in your upload. Review and customize each merge:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Uncheck individual keywords to exclude them from merging</li>
                  <li>Keywords with different numbers (e.g., "UFC 203" vs "UFC 300") are treated as separate and won't be merged</li>
                  <li>Merged keywords combine search volumes while keeping the longest variant as the name</li>
                  <li>At least 2 keywords must be selected for a merge to be valid</li>
                </ul>
              </div>
            </div>
          </div>

          {mergeGroups.map((group) => (
            <div
              key={group.id}
              className={`rounded-lg border ${
                selectedMerges.has(group.id)
                  ? theme === 'dark'
                    ? 'border-green-700 bg-green-900/20'
                    : 'border-green-300 bg-green-50'
                  : theme === 'dark'
                  ? 'border-gray-700 bg-gray-800/50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedMerges.has(group.id)}
                    onChange={() => toggleMerge(group.id)}
                    className="mt-1 w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <GitMerge className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                      <span className="font-semibold">Merge Group</span>
                      {selectedMerges.has(group.id) && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          theme === 'dark' ? 'bg-green-700 text-green-200' : 'bg-green-200 text-green-800'
                        }`}>
                          <Check className="w-3 h-3 inline mr-1" />
                          Active
                        </span>
                      )}
                    </div>
                    <div className={`mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      <div className="text-sm font-medium mb-2">Select keywords to merge:</div>
                      <div className="space-y-2 pl-2">
                        {group.variants.map((variant) => {
                          const isSelected = selectedVariants.get(group.id)?.has(variant) ?? false;
                          const isPrimary = variant === group.primaryKeyword;
                          return (
                            <div key={variant} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleVariant(group.id, variant)}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className={`text-sm ${isSelected ? '' : 'opacity-50'}`}>
                                {variant}
                                {isPrimary && (
                                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                                    theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    primary
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      {selectedVariants.get(group.id)?.size || 0} of {group.variants.length} keywords selected
                      {(selectedVariants.get(group.id)?.size || 0) < 2 && (
                        <span className={`ml-2 ${theme === 'dark' ? 'text-yellow-500' : 'text-yellow-600'}`}>
                          (minimum 2 required)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={`flex items-center justify-between p-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {selectedMerges.size} of {mergeGroups.length} merges selected
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className={`px-4 py-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Cancel Upload
            </button>
            <button
              onClick={handleApprove}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Check className="w-4 h-4" />
              Continue Upload ({selectedMerges.size} merges)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
