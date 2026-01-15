import { useState, useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface KeywordOption {
  keyword: string;
  brand: string;
  avgMonthlySearches: number;
}

interface KeywordSelectorProps {
  availableKeywords: KeywordOption[];
  selectedKeywords: KeywordOption[];
  onSelectionChange: (keywords: KeywordOption[]) => void;
  theme: 'light' | 'dark';
  disabled?: boolean;
  maxSelection?: number;
}

export default function KeywordSelector({
  availableKeywords,
  selectedKeywords,
  onSelectionChange,
  theme,
  disabled = false,
  maxSelection = 6
}: KeywordSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredKeywords = availableKeywords.filter((kw) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      kw.keyword.toLowerCase().includes(searchLower) ||
      kw.brand.toLowerCase().includes(searchLower)
    );
  });

  const isSelected = (keyword: KeywordOption) => {
    return selectedKeywords.some(
      (selected) => selected.keyword === keyword.keyword && selected.brand === keyword.brand
    );
  };

  const toggleKeyword = (keyword: KeywordOption) => {
    if (disabled) return;

    if (isSelected(keyword)) {
      onSelectionChange(
        selectedKeywords.filter(
          (selected) => !(selected.keyword === keyword.keyword && selected.brand === keyword.brand)
        )
      );
    } else {
      if (selectedKeywords.length >= maxSelection) {
        return;
      }
      onSelectionChange([...selectedKeywords, keyword]);
    }
  };

  const removeKeyword = (keyword: KeywordOption, event: React.MouseEvent) => {
    event.stopPropagation();
    onSelectionChange(
      selectedKeywords.filter(
        (selected) => !(selected.keyword === keyword.keyword && selected.brand === keyword.brand)
      )
    );
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`min-h-[48px] rounded-lg border px-4 py-2 cursor-pointer transition-colors ${
          disabled
            ? theme === 'dark'
              ? 'bg-gray-800 border-gray-700 cursor-not-allowed opacity-50'
              : 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
            : theme === 'dark'
            ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
            : 'bg-white border-gray-300 hover:border-gray-400'
        }`}
      >
        {selectedKeywords.length === 0 ? (
          <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>
            Select keywords to compare (max {maxSelection})
          </span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedKeywords.map((keyword) => (
              <div
                key={`${keyword.keyword}-${keyword.brand}`}
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  theme === 'dark'
                    ? 'bg-blue-900/50 text-blue-300'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                <span className="font-bold">{keyword.keyword}</span>
                <span className={theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}>
                  ({keyword.brand})
                </span>
                {!disabled && (
                  <button
                    onClick={(e) => removeKeyword(keyword, e)}
                    className={`hover:bg-blue-800/50 rounded-full p-0.5 transition-colors ${
                      theme === 'dark' ? 'hover:text-white' : 'hover:text-blue-900'
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isOpen && !disabled && (
        <div
          className={`absolute z-50 mt-2 w-full rounded-lg border shadow-lg max-h-96 overflow-hidden ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="p-3 border-b border-gray-700">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search keywords or brands..."
              className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="overflow-y-auto max-h-80">
            {filteredKeywords.length === 0 ? (
              <div className={`p-4 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                No keywords found
              </div>
            ) : (
              filteredKeywords.map((keyword) => {
                const selected = isSelected(keyword);
                const canSelect = !selected && selectedKeywords.length < maxSelection;
                const isDisabled = !selected && !canSelect;

                return (
                  <div
                    key={`${keyword.keyword}-${keyword.brand}`}
                    onClick={() => !isDisabled && toggleKeyword(keyword)}
                    className={`px-4 py-3 border-b cursor-pointer transition-colors ${
                      theme === 'dark'
                        ? 'border-gray-700 hover:bg-gray-700'
                        : 'border-gray-100 hover:bg-gray-50'
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold truncate ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}
                          >
                            {keyword.keyword}
                          </span>
                          <span
                            className={`text-sm px-2 py-0.5 rounded ${
                              theme === 'dark'
                                ? 'bg-gray-700 text-gray-300'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {keyword.brand}
                          </span>
                        </div>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatNumber(keyword.avgMonthlySearches)} monthly searches
                        </div>
                      </div>

                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selected
                            ? 'bg-blue-600 border-blue-600'
                            : theme === 'dark'
                            ? 'border-gray-600'
                            : 'border-gray-300'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {selectedKeywords.length >= maxSelection && (
            <div className={`p-3 text-center text-sm border-t ${
              theme === 'dark'
                ? 'bg-amber-900/20 text-amber-400 border-gray-700'
                : 'bg-amber-50 text-amber-700 border-gray-200'
            }`}>
              Maximum {maxSelection} keywords can be selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}
