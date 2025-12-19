import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Merge, X } from 'lucide-react';

interface KeywordData {
  keyword: string;
  brand: string;
  [key: string]: any;
}

interface MergeGroup {
  id: string;
  primaryKeyword: string;
  variants: string[];
  mergedData: KeywordData;
  originalData: KeywordData[];
}

interface KeywordMergeReviewProps {
  mergeGroups: MergeGroup[];
  onApprove: (approvedMerges: MergeGroup[]) => void;
  onCancel: () => void;
  theme?: 'dark' | 'light';
}

export default function KeywordMergeReview({
  mergeGroups: initialMergeGroups,
  onApprove,
  onCancel,
  theme = 'light'
}: KeywordMergeReviewProps) {
  const [mergeGroups, setMergeGroups] = useState<MergeGroup[]>(initialMergeGroups);
  const [selectedMerges, setSelectedMerges] = useState<Set<string>>(
    new Set(initialMergeGroups.map(g => g.id))
  );

  const recalculateMergedData = (originalData: KeywordData[]): KeywordData => {
    if (originalData.length === 0) {
      return {} as KeywordData;
    }

    const primaryKeyword = originalData.reduce((longest, current) =>
      current.keyword.length > longest.keyword.length ? current : longest
    ).keyword;

    const mergedData: any = {
      keyword: primaryKeyword,
      brand: originalData[0].brand
    };

    const numericFields = new Set<string>();
    originalData.forEach(item => {
      Object.keys(item).forEach(key => {
        if (typeof item[key] === 'number' && !['user_id'].includes(key)) {
          numericFields.add(key);
        }
      });
    });

    numericFields.forEach(field => {
      mergedData[field] = originalData.reduce((sum, item) => sum + (item[field] || 0), 0);
    });

    Object.keys(originalData[0]).forEach(key => {
      if (!numericFields.has(key) && !['keyword', 'brand', 'user_id', 'created_at'].includes(key)) {
        const nonZeroValues = originalData
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

    return mergedData;
  };

  const removeKeywordFromMerge = (groupId: string, keywordToRemove: string) => {
    setMergeGroups(prev => {
      return prev
        .map(group => {
          if (group.id !== groupId) return group;

          const updatedOriginalData = group.originalData.filter(
            item => item.keyword !== keywordToRemove
          );
          const updatedVariants = group.variants.filter(v => v !== keywordToRemove);

          if (updatedOriginalData.length <= 1) {
            return null;
          }

          const updatedMergedData = recalculateMergedData(updatedOriginalData);

          return {
            ...group,
            primaryKeyword: updatedMergedData.keyword,
            variants: updatedVariants,
            mergedData: updatedMergedData,
            originalData: updatedOriginalData
          };
        })
        .filter((group): group is MergeGroup => group !== null);
    });
  };

  useEffect(() => {
    setSelectedMerges(prev => {
      const validIds = new Set(mergeGroups.map(g => g.id));
      return new Set([...prev].filter(id => validIds.has(id)));
    });
  }, [mergeGroups]);

  const toggleMerge = (id: string) => {
    setSelectedMerges(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedMerges(new Set(mergeGroups.map(g => g.id)));
  };

  const deselectAll = () => {
    setSelectedMerges(new Set());
  };

  const handleApprove = () => {
    const approved = mergeGroups.filter(g => selectedMerges.has(g.id));
    onApprove(approved);
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    if (typeof value === 'string') {
      return value;
    }
    return String(value);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className={`max-w-6xl w-full my-8 rounded-lg shadow-xl ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
        <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <Merge className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Review Keyword Merges
            </h2>
          </div>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Found {mergeGroups.length} groups of similar keywords that can be merged.
            Review and approve the merges you want to apply.
          </p>
        </div>

        <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Deselect All
            </button>
            <div className={`ml-auto text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {selectedMerges.size} of {mergeGroups.length} selected
            </div>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="space-y-4">
            {mergeGroups.map((group) => {
              const isSelected = selectedMerges.has(group.id);
              return (
                <div
                  key={group.id}
                  className={`border rounded-lg p-4 transition-all ${
                    isSelected
                      ? theme === 'dark'
                        ? 'border-blue-500 bg-blue-900/10'
                        : 'border-blue-400 bg-blue-50'
                      : theme === 'dark'
                      ? 'border-gray-700 bg-gray-750'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleMerge(group.id)}
                      className={`flex-shrink-0 mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? theme === 'dark'
                            ? 'bg-blue-600 border-blue-600'
                            : 'bg-blue-600 border-blue-600'
                          : theme === 'dark'
                          ? 'border-gray-600 hover:border-gray-500'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className={`w-4 h-4 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          Similar keywords detected
                        </span>
                      </div>

                      <div className="mb-3">
                        <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Will merge into:
                        </div>
                        <div className={`font-bold text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {group.primaryKeyword}
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Variants ({group.variants.length}):
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.variants.map((variant, idx) => (
                            <span
                              key={idx}
                              className={`group/variant text-xs px-2 py-1 rounded flex items-center gap-1.5 ${
                                theme === 'dark'
                                  ? 'bg-gray-700 text-gray-300'
                                  : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              {variant}
                              <button
                                onClick={() => removeKeywordFromMerge(group.id, variant)}
                                className={`opacity-0 group-hover/variant:opacity-100 transition-opacity hover:bg-red-500 hover:text-white rounded-full p-0.5 ${
                                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                }`}
                                title="Remove from merge"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(group.mergedData)
                            .filter(([key]) => !['keyword', 'brand', 'user_id', 'created_at'].includes(key))
                            .slice(0, 4)
                            .map(([key, value]) => (
                              <div key={key}>
                                <span className="font-semibold">{key}:</span> {formatValue(value)}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`p-6 border-t flex items-center justify-between ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Cancel Upload
          </button>
          <button
            onClick={handleApprove}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-colors ${
              selectedMerges.size > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={selectedMerges.size === 0}
          >
            <CheckCircle className="w-5 h-5" />
            Approve {selectedMerges.size > 0 && `${selectedMerges.size} Merge${selectedMerges.size > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
