import { useState } from 'react';
import { Upload } from 'lucide-react';
import { TrendingTopic } from '../types';

interface FileUploadProps {
  onUpload: (topics: TrendingTopic[]) => void;
}

export default function FileUpload({ onUpload }: FileUploadProps) {
  const [fileName, setFileName] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const parsedTopics = parseCSV(text);
        onUpload(parsedTopics);
      };
      reader.readAsText(file);
    }
  };

  const parseCSV = (csvText: string): TrendingTopic[] => {
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
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
    <div className="mb-8">
      <label
        htmlFor="file-upload"
        className="flex items-center justify-center cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 w-full max-w-md mx-auto"
      >
        <Upload className="mr-2" size={20} />
        {fileName || 'Upload CSV File'}
        <input
          id="file-upload"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
      <p className="text-gray-400 text-sm text-center mt-2">
        CSV format: Topic Name, Search Volume, Explore Link (optional), Started (optional)
      </p>
    </div>
  );
}
