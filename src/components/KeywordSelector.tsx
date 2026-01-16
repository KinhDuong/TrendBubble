import { useState, useRef, useEffect } from 'react';
import { X, Check, Search as SearchIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface KeywordOption {
  keyword: string;
  brand: string;
  avgMonthlySearches: number;
}

interface KeywordSelectorProps {
  selectedKeywords: KeywordOption[];
  onSelectionChange: (keywords: KeywordOption[]) => void;
  theme: 'light' | 'dark';
  disabled?: boolean;
  maxSelection?: number;
  userId?: string;
}

export default function KeywordSelector({
  selectedKeywords,
  onSelectionChange,
  theme,
  disabled = false,
  maxSelection = 6,
  userId
}: KeywordSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<KeywordOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      await performSearch(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, userId]);

  const performSearch = async (query: string) => {
    try {
      const searchPattern = `%${query}%`;

      let dbQuery = supabase
        .from('brand_keyword_data')
        .select('keyword, brand, "Avg. monthly searches"')
        .not('"Avg. monthly searches"', 'is', null)
        .or(`keyword.ilike.${searchPattern},brand.ilike.${searchPattern}`)
        .order('"Avg. monthly searches"', { ascending: false })
        .limit(50);

      if (userId) {
        dbQuery = dbQuery.eq('user_id', userId);
      }

      const { data, error } = await dbQuery;

      if (error) throw error;

      const keywordMap = new Map<string, KeywordOption>();

      data?.forEach((item) => {
        const key = `${item.keyword}|||${item.brand}`;
        const currentSearches = item['Avg. monthly searches'] || 0;

        if (!keywordMap.has(key) || (keywordMap.get(key)?.avgMonthlySearches || 0) < currentSearches) {
          keywordMap.set(key, {
            keyword: item.keyword,
            brand: item.brand,
            avgMonthlySearches: currentSearches
          });
        }
      });

      const results = Array.from(keywordMap.values()).sort(
        (a, b) => b.avgMonthlySearches - a.avgMonthlySearches
      );

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching keywords:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const filteredKeywords = searchResults;

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
          <div className={`p-3 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="relative">
              <SearchIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search keywords or brands..."
                className={`w-full pl-10 pr-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'dark'
                    ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
            {searchQuery.length > 0 && searchQuery.length < 2 && (
              <p className={`mt-2 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                Type at least 2 characters to search
              </p>
            )}
          </div>

          <div className="overflow-y-auto max-h-80">
            {isSearching ? (
              <div className={`p-8 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm">Searching...</p>
              </div>
            ) : searchQuery.length < 2 ? (
              <div className={`p-8 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                <SearchIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Start typing to search keywords</p>
              </div>
            ) : filteredKeywords.length === 0 ? (
              <div className={`p-8 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                <p className="text-sm">No keywords found matching "{searchQuery}"</p>
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
