import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

interface Brand {
  name: string;
  color: string;
}

interface BrandSelectorProps {
  availableBrands: string[];
  selectedBrands: string[];
  onSelectionChange: (brands: string[]) => void;
  theme: 'dark' | 'light';
  disabled?: boolean;
}

const MAX_BRANDS = 5;

const BRAND_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#6366F1', // indigo
  '#84CC16', // lime
];

export function getBrandColor(brandName: string, allBrands: string[] = []): string {
  if (!allBrands || allBrands.length === 0) {
    return BRAND_COLORS[0];
  }
  const index = allBrands.indexOf(brandName);
  return BRAND_COLORS[index >= 0 ? index % BRAND_COLORS.length : 0];
}

export default function BrandSelector({
  availableBrands,
  selectedBrands,
  onSelectionChange,
  theme,
  disabled = false
}: BrandSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleBrand = (brandName: string) => {
    if (selectedBrands.includes(brandName)) {
      if (selectedBrands.length > 1) {
        onSelectionChange(selectedBrands.filter(b => b !== brandName));
      }
    } else {
      if (selectedBrands.length < MAX_BRANDS) {
        onSelectionChange([...selectedBrands, brandName]);
      }
    }
  };

  const handleDeselectAll = () => {
    if (availableBrands.length > 0) {
      onSelectionChange([availableBrands[0]]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center justify-between gap-2 px-4 py-2 rounded-lg border transition-colors min-w-[200px] ${
          disabled
            ? theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
            : theme === 'dark'
            ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700'
            : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {selectedBrands.length === 1 ? (
            <span className="text-sm font-medium">{selectedBrands[0]}</span>
          ) : (
            <span className="text-sm font-medium">{selectedBrands.length} brands selected</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full left-0 mt-2 w-[300px] rounded-lg border shadow-lg z-50 max-h-[400px] overflow-y-auto ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className={`sticky top-0 p-2 border-b ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handleDeselectAll}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className={`px-2 py-1.5 rounded transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-700 text-gray-400'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
                aria-label="Close dropdown"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-2">
            {availableBrands.map((brand) => {
              const isSelected = selectedBrands.includes(brand);
              const brandColor = getBrandColor(brand, availableBrands);
              const isOnlySelected = selectedBrands.length === 1 && isSelected;
              const isLimitReached = !isSelected && selectedBrands.length >= MAX_BRANDS;

              return (
                <button
                  key={brand}
                  onClick={() => handleToggleBrand(brand)}
                  disabled={isOnlySelected || isLimitReached}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                    isOnlySelected || isLimitReached
                      ? theme === 'dark'
                        ? 'bg-gray-900 cursor-not-allowed opacity-50'
                        : 'bg-gray-100 cursor-not-allowed opacity-50'
                      : theme === 'dark'
                      ? 'hover:bg-gray-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: brandColor }}
                    />
                    <span
                      className={`text-sm font-medium truncate ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {brand}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 flex-shrink-0 text-green-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
