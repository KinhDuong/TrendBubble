import { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { TrendingTopic } from '../types';

interface FileUploadProps {
  onUpload: (topics: TrendingTopic[]) => Promise<void>;
  theme: 'dark' | 'light';
  sourceFilter: string;
}

const COMMON_CATEGORIES = [
  'Politics',
  'Sports',
  'Entertainment',
  'Technology',
  'Business',
  'Health',
  'Science',
  'World News',
  'Local News',
  'Weather',
  'Other'
];

export default function FileUpload({ onUpload, theme, sourceFilter }: FileUploadProps) {
  const [fileName, setFileName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (sourceFilter === 'all') {
        alert('Please select a specific source before uploading a CSV file.');
        event.target.value = '';
        return;
      }
      setFileName(file.name);
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const parsedTopics = parseCSV(text);
        const topicsWithCategory = parsedTopics.map(topic => ({
          ...topic,
          category: selectedCategory || undefined
        }));
        await onUpload(topicsWithCategory);
        setIsUploading(false);
        setFileName('');
      };
      reader.readAsText(file);
    }
  };

  const filteredCategories = COMMON_CATEGORIES.filter(cat =>
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setCategorySearch(category);
    setShowCategoryDropdown(false);
  };

  const parseCSV = (csvText: string): TrendingTopic[] => {
    const decodeHtmlEntities = (text: string): string => {
      const entities: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&apos;': "'",
        '&#x27;': "'",
        '&#x2F;': '/',
        '&nbsp;': ' ',
      };

      return text.replace(/&[#\w]+;/g, (match) => {
        return entities[match] || match;
      });
    };

    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(decodeHtmlEntities(current.trim()));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(decodeHtmlEntities(current.trim()));
      return result;
    };

    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    const nameIndex = headers.findIndex(h => h.includes('topic') || h.includes('name'));
    const volumeIndex = headers.findIndex(h => h.includes('volume') || h.includes('search'));
    const urlIndex = headers.findIndex(h => h.includes('explore') || h.includes('link') || h.includes('url'));
    const startedIndex = headers.findIndex(h => h.includes('started'));

    const parseSearchVolumeForSize = (volumeStr: string): number => {
      const cleanStr = volumeStr.replace(/[^0-9.MKmk+]/g, '').replace(/\+/g, '');

      if (cleanStr.includes('M') || cleanStr.includes('m')) {
        const num = parseFloat(cleanStr.replace(/[Mm]/g, ''));
        return Math.floor(num * 1000000);
      } else if (cleanStr.includes('K') || cleanStr.includes('k')) {
        const num = parseFloat(cleanStr.replace(/[Kk]/g, ''));
        return Math.floor(num * 1000);
      } else {
        const num = parseFloat(cleanStr);
        return Math.floor(num || 0);
      }
    };

    return lines
      .slice(1)
      .filter(line => line.trim() !== '')
      .map(line => {
        const values = parseCSVLine(line);
        const name = values[nameIndex >= 0 ? nameIndex : 0] || '';
        const searchVolumeRaw = values[volumeIndex >= 0 ? volumeIndex : 1] || '';
        const url = urlIndex >= 0 ? values[urlIndex] : undefined;
        const pubDateRaw = startedIndex >= 0 ? values[startedIndex] : undefined;

        const cleanedRaw = searchVolumeRaw.replace(/^"|"$/g, '').trim();

        let pubDate: string | undefined = undefined;
        if (pubDateRaw && pubDateRaw.trim() !== '') {
          const cleanedDate = pubDateRaw.replace(/^"|"$/g, '').trim();
          const parsedDate = new Date(cleanedDate);
          if (!isNaN(parsedDate.getTime())) {
            pubDate = parsedDate.toISOString();
          }
        }

        return {
          name: name.replace(/^"|"$/g, '').trim(),
          searchVolumeRaw: cleanedRaw,
          searchVolume: parseSearchVolumeForSize(cleanedRaw),
          url: url && url.trim() !== '' ? url.replace(/^"|"$/g, '').trim() : undefined,
          pubDate
        };
      });
  };

  return (
    <div className="w-full flex flex-col md:flex-row items-center gap-3">
      <div className="relative flex-shrink-0 w-full md:w-48">
        <input
          type="text"
          value={categorySearch}
          onChange={(e) => {
            setCategorySearch(e.target.value);
            setShowCategoryDropdown(true);
          }}
          onFocus={() => setShowCategoryDropdown(true)}
          placeholder="Category (optional)"
          className={`w-full px-3 py-2 rounded-lg border text-sm ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
        {showCategoryDropdown && filteredCategories.length > 0 && (
          <div className={`absolute z-10 w-full mt-1 rounded-lg border shadow-lg max-h-60 overflow-y-auto ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600'
              : 'bg-white border-gray-300'
          }`}>
            {filteredCategories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategorySelect(category)}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-600 text-white'
                    : 'hover:bg-gray-100 text-gray-900'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}
      </div>

      <label
        htmlFor="file-upload"
        className={`flex items-center justify-center text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium ${
          isUploading ? 'bg-blue-500 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
        }`}
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 animate-spin" size={18} />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2" size={18} />
            Upload CSV
          </>
        )}
        <input
          id="file-upload"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
      </label>
    </div>
  );
}
