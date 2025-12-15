import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BrandKeywordUploadProps {
  onUploadComplete: () => void;
}

export default function BrandKeywordUpload({ onUploadComplete }: BrandKeywordUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const parseMonthFromHeader = (header: string): string | null => {
    const searchesMatch = header.match(/searches?:\s*(\w+)\s+(\d{4})/i);
    if (searchesMatch) {
      const [, month, year] = searchesMatch;
      const monthMap: { [key: string]: string } = {
        jan: '01', january: '01',
        feb: '02', february: '02',
        mar: '03', march: '03',
        apr: '04', april: '04',
        may: '05',
        jun: '06', june: '06',
        jul: '07', july: '07',
        aug: '08', august: '08',
        sep: '09', september: '09',
        oct: '10', october: '10',
        nov: '11', november: '11',
        dec: '12', december: '12'
      };
      const monthNum = monthMap[month.toLowerCase()];
      if (monthNum) {
        return `${year}-${monthNum}-01`;
      }
    }
    return null;
  };

  const parseCSV = (text: string): Array<{
    brand: string;
    keyword: string;
    search_volume: number;
    month: string;
  }> => {
    const lines = text.split('\n').filter(line => line.trim());
    const rawHeaders = lines[0].split(',').map(h => h.trim());
    const headers = rawHeaders.map(h => h.toLowerCase());

    const monthColumns: Array<{ index: number; month: string }> = [];
    headers.forEach((header, index) => {
      const month = parseMonthFromHeader(header);
      if (month) {
        monthColumns.push({ index, month });
      }
    });

    if (monthColumns.length > 0) {
      const keywordIndex = headers.findIndex(h => h.includes('keyword'));
      const brandIndex = headers.findIndex(h => h.includes('brand'));

      if (keywordIndex === -1) {
        throw new Error('CSV must contain a "keyword" column');
      }

      const results: Array<{
        brand: string;
        keyword: string;
        search_volume: number;
        month: string;
      }> = [];

      const defaultBrand = brandIndex !== -1 ? '' : 'Unknown Brand';

      lines.slice(1).forEach(line => {
        const values = line.split(',').map(v => v.trim());
        const keyword = values[keywordIndex];
        const brand = brandIndex !== -1 ? values[brandIndex] : defaultBrand;

        if (!keyword) return;

        monthColumns.forEach(({ index, month }) => {
          const volume = parseInt(values[index]) || 0;
          if (volume > 0) {
            results.push({
              brand: brand || 'Unknown Brand',
              keyword,
              search_volume: volume,
              month
            });
          }
        });
      });

      return results.filter(row => row.keyword);
    }

    const brandIndex = headers.findIndex(h => h.includes('brand'));
    const keywordIndex = headers.findIndex(h => h.includes('keyword'));
    const volumeIndex = headers.findIndex(h => h.includes('volume') || h.includes('search'));
    const monthIndex = headers.findIndex(h => h.includes('month') || h.includes('date'));

    if (brandIndex === -1 || keywordIndex === -1 || volumeIndex === -1 || monthIndex === -1) {
      throw new Error('CSV must contain either:\n1) "Searches: MMM YYYY" columns, OR\n2) brand, keyword, search_volume/volume, month/date columns');
    }

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const monthValue = values[monthIndex];

      let formattedMonth = monthValue;
      if (monthValue && !monthValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(monthValue);
        if (!isNaN(date.getTime())) {
          formattedMonth = date.toISOString().split('T')[0];
        }
      }

      return {
        brand: values[brandIndex],
        keyword: values[keywordIndex],
        search_volume: parseInt(values[volumeIndex]) || 0,
        month: formattedMonth
      };
    }).filter(row => row.brand && row.keyword && row.month);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const text = await file.text();
      const data = parseCSV(text);

      if (data.length === 0) {
        throw new Error('No valid data found in CSV');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to upload data');
      }

      const recordsToInsert = data.map(row => ({
        brand: row.brand,
        keyword: row.keyword,
        search_volume: row.search_volume,
        month: row.month,
        user_id: user.id
      }));

      const { error: insertError } = await supabase
        .from('brand_keyword_data')
        .insert(recordsToInsert);

      if (insertError) throw insertError;

      await calculateMonthlyData(data, user.id);

      setSuccess(`Successfully uploaded ${data.length} records`);
      onUploadComplete();

      event.target.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const calculateMonthlyData = async (data: Array<{
    brand: string;
    keyword: string;
    search_volume: number;
    month: string;
  }>, userId: string) => {
    const monthlyMap = new Map<string, {
      brand: string;
      month: string;
      total_volume: number;
      keywords: Array<{ keyword: string; volume: number }>;
    }>();

    data.forEach(row => {
      const yearMonth = row.month.substring(0, 7);
      const firstOfMonth = `${yearMonth}-01`;
      const key = `${row.brand}-${yearMonth}`;

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          brand: row.brand,
          month: firstOfMonth,
          total_volume: 0,
          keywords: []
        });
      }
      const entry = monthlyMap.get(key)!;
      entry.total_volume += row.search_volume;
      entry.keywords.push({ keyword: row.keyword, volume: row.search_volume });
    });

    const monthlyRecords = Array.from(monthlyMap.values()).map(entry => ({
      brand: entry.brand,
      month: entry.month,
      total_volume: entry.total_volume,
      keyword_count: entry.keywords.length,
      top_keywords: entry.keywords
        .sort((a, b) => b.volume - a.volume),
      user_id: userId
    }));

    const { error: monthlyError } = await supabase
      .from('brand_keyword_monthly_data')
      .upsert(monthlyRecords, {
        onConflict: 'brand,month,user_id',
        ignoreDuplicates: false
      });

    if (monthlyError) {
      console.error('Error upserting monthly data:', monthlyError);
      throw monthlyError;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Upload Keyword Data</h2>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2 font-semibold">
          Upload CSV in one of two formats:
        </p>
        <div className="text-xs text-gray-500 space-y-2">
          <div>
            <p className="font-semibold">Format 1 (Long format):</p>
            <p>Columns: brand, keyword, search_volume, month</p>
            <p className="italic">Example: Nike, "running shoes", 12000, 2024-01-01</p>
          </div>
          <div>
            <p className="font-semibold">Format 2 (Wide format with monthly columns):</p>
            <p>Columns: keyword, Searches: Nov 2021, Searches: Dec 2021, ...</p>
            <p className="italic">Example: "running shoes", 10000, 12000, 15000</p>
            <p className="text-gray-400">(Brand column is optional for this format)</p>
          </div>
        </div>
      </div>

      <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
        <div className="flex flex-col items-center">
          <Upload className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-sm text-gray-600">
            {uploading ? 'Uploading...' : 'Click to upload CSV file'}
          </span>
        </div>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}
    </div>
  );
}
