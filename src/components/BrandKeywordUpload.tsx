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

  const parseCSV = (text: string): Array<{
    brand: string;
    keyword: string;
    search_volume: number;
    month: string;
  }> => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    const brandIndex = headers.findIndex(h => h.includes('brand'));
    const keywordIndex = headers.findIndex(h => h.includes('keyword'));
    const volumeIndex = headers.findIndex(h => h.includes('volume') || h.includes('search'));
    const monthIndex = headers.findIndex(h => h.includes('month') || h.includes('date'));

    if (brandIndex === -1 || keywordIndex === -1 || volumeIndex === -1 || monthIndex === -1) {
      throw new Error('CSV must contain columns: brand, keyword, search_volume/volume, month/date');
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
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 10),
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
        <p className="text-sm text-gray-600 mb-2">
          Upload a CSV file with columns: brand, keyword, search_volume, month
        </p>
        <p className="text-xs text-gray-500">
          Example: Nike, "running shoes", 12000, 2024-01-01
        </p>
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
