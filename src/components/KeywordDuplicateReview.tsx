import React from 'react';
import { X, AlertTriangle, Copy } from 'lucide-react';

interface DuplicateGroup {
  id: string;
  keywords: string[];
  sharedData: any;
}

interface KeywordDuplicateReviewProps {
  duplicateGroups: DuplicateGroup[];
  onCancel: () => void;
  theme: 'dark' | 'light';
}

export default function KeywordDuplicateReview({
  duplicateGroups,
  onCancel,
  theme,
}: KeywordDuplicateReviewProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`${
          theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        } rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col`}
      >
        <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-6 h-6 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
            <h2 className="text-2xl font-bold">Duplicate Data Detected</h2>
          </div>
          <button
            onClick={onCancel}
            className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'} mt-0.5 flex-shrink-0`} />
              <div className={`text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-800'}`}>
                <p className="font-semibold mb-1">Exact duplicate data found</p>
                <p className="mb-2">
                  We found {duplicateGroups.length} groups of keywords with identical data (search volumes, competition, bids, etc.).
                  These appear to be data errors where the same data was duplicated with different keyword variations.
                </p>
                <p className="font-semibold">Please remove these duplicates from your CSV file and re-upload.</p>
              </div>
            </div>
          </div>

          {duplicateGroups.map((group) => (
            <div
              key={group.id}
              className={`rounded-lg border ${
                theme === 'dark'
                  ? 'border-red-700 bg-red-900/10'
                  : 'border-red-300 bg-red-50'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <Copy className={`w-5 h-5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'} mt-0.5 flex-shrink-0`} />
                  <div className="flex-1">
                    <div className="mb-2">
                      <span className="font-semibold text-lg">Duplicate Group {group.id}</span>
                    </div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
                      <span className="font-medium">Keywords with identical data:</span>
                      <ul className="mt-2 space-y-1 ml-4">
                        {group.keywords.map((keyword, idx) => (
                          <li key={idx} className="list-disc">{keyword}</li>
                        ))}
                      </ul>
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} p-3 rounded ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100'}`}>
                      <div className="font-semibold mb-1">Shared data values:</div>
                      <div className="grid grid-cols-2 gap-2">
                        {group.sharedData['Avg. monthly searches'] && (
                          <div>Avg. monthly searches: {group.sharedData['Avg. monthly searches'].toLocaleString()}</div>
                        )}
                        {group.sharedData['Competition (indexed value)'] !== undefined && (
                          <div>Competition: {group.sharedData['Competition (indexed value)']}</div>
                        )}
                        {group.sharedData['Top of page bid (low range)'] !== undefined && (
                          <div>Bid (low): {group.sharedData['Top of page bid (low range)']}</div>
                        )}
                        {group.sharedData['Top of page bid (high range)'] !== undefined && (
                          <div>Bid (high): {group.sharedData['Top of page bid (high range)']}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={`flex items-center justify-between p-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {duplicateGroups.reduce((sum, group) => sum + group.keywords.length, 0)} duplicate keywords found across {duplicateGroups.length} groups
          </div>
          <button
            onClick={onCancel}
            className={`px-6 py-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            Close & Fix CSV
          </button>
        </div>
      </div>
    </div>
  );
}
