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
}

export default function KeywordMergeReview({
  mergeGroups,
  onApprove,
  onCancel,
  theme,
}: KeywordMergeReviewProps) {
  const [selectedMerges, setSelectedMerges] = useState<Set<string>>(
    new Set(mergeGroups.map(g => g.id))
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

  const handleApprove = () => {
    const approvedMerges = mergeGroups.filter(g => selectedMerges.has(g.id));
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
                <p>We found {mergeGroups.length} groups of similar keywords in your upload. Review and select which ones to merge. Merging will combine their search volumes while keeping the longest variant as the keyword name.</p>
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
                    <div className="flex items-center gap-2 mb-2">
                      <GitMerge className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                      <span className="font-semibold">Merge into: {group.primaryKeyword}</span>
                      {selectedMerges.has(group.id) && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          theme === 'dark' ? 'bg-green-700 text-green-200' : 'bg-green-200 text-green-800'
                        }`}>
                          <Check className="w-3 h-3 inline mr-1" />
                          Selected
                        </span>
                      )}
                    </div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                      <span className="font-medium">Variants to merge:</span> {group.variants.join(', ')}
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      {group.variants.length} keywords will be combined
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
