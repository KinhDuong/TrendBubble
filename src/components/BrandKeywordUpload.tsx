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
  const [brandName, setBrandName] = useState<string>('');

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

  const parseCSV = (text: string): Array<Record<string, any>> => {
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 3) {
      throw new Error('CSV must have at least 3 rows (title, date, headers, data)');
    }

    const rawHeaders = lines[2].split('\t').map(h => h.trim());

    if (rawHeaders.length === 0) {
      throw new Error('No headers found in CSV');
    }

    const keywordIndex = rawHeaders.findIndex(h => h.toLowerCase() === 'keyword');

    if (keywordIndex === -1) {
      throw new Error('CSV must contain a "Keyword" column');
    }

    const results: Array<Record<string, any>> = [];

    lines.slice(3).forEach(line => {
      if (!line.trim()) return;

      const values = line.split('\t').map(v => v.trim());
      const keyword = values[keywordIndex];

      if (!keyword) return;

      rawHeaders.forEach((header, index) => {
        if (index === keywordIndex) return;

        const value = values[index];
        if (!value || value === '' || value === '0') return;

        if (header.toLowerCase().startsWith('searches:')) {
          const parsedValue = parseInt(value.replace(/,/g, ''));
          if (!isNaN(parsedValue) && parsedValue > 0) {
            const month = parseMonthFromHeader(header);
            if (month) {
              results.push({
                keyword: keyword,
                brand: brandName || 'Unknown',
                search_volume: parsedValue,
                month: month
              });
            }
          }
        }
      });
    });

    return results.filter(row => row.keyword && row.month && row.search_volume > 0);
  };

  const aggregateMonthlyData = (data: Array<Record<string, any>>) => {
    const monthlyMap = new Map<string, { keywords: Array<{ keyword: string; volume: number }>, totalVolume: number }>();

    data.forEach(row => {
      const month = row.month;
      if (!month) return;

      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { keywords: [], totalVolume: 0 });
      }

      const monthData = monthlyMap.get(month)!;
      monthData.keywords.push({
        keyword: row.keyword,
        volume: row.search_volume || 0
      });
      monthData.totalVolume += (row.search_volume || 0);
    });

    const aggregated = Array.from(monthlyMap.entries()).map(([month, data]) => {
      const topKeywords = data.keywords
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 100);

      return {
        brand: brandName.trim(),
        month: month,
        total_volume: data.totalVolume,
        keyword_count: data.keywords.length,
        top_keywords: topKeywords
      };
    });

    return aggregated;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!brandName.trim()) {
      setError('Please enter a brand name before uploading');
      event.target.value = '';
      return;
    }

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
        ...row,
        user_id: user.id,
        created_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('brand_keyword_data')
        .insert(recordsToInsert);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Database error: ${insertError.message || 'Unknown error'}`);
      }

      const aggregatedData = aggregateMonthlyData(data);

      if (aggregatedData.length > 0) {
        const monthlyRecords = aggregatedData.map(record => ({
          ...record,
          user_id: user.id,
          created_at: new Date().toISOString()
        }));

        const { error: monthlyInsertError } = await supabase
          .from('brand_keyword_monthly_data')
          .upsert(monthlyRecords, {
            onConflict: 'brand,month,user_id',
            ignoreDuplicates: false
          });

        if (monthlyInsertError) {
          console.error('Monthly data insert error:', monthlyInsertError);
        }
      }

      setSuccess(`Successfully uploaded ${data.length} keyword records across ${aggregatedData.length} months`);
      onUploadComplete();

      event.target.value = '';
    } catch (err) {
      console.error('Upload error details:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };


  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Upload Keyword Data</h2>

      <div className="mb-4">
        <label htmlFor="brandName" className="block text-sm font-semibold text-gray-700 mb-2">
          Brand Name *
        </label>
        <input
          id="brandName"
          type="text"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder="Enter brand name (e.g., Starbucks, Nike)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2 font-semibold">
          Upload CSV/TSV file with keyword data
        </p>
        <div className="text-xs text-gray-500 space-y-2">
          <div>
            <p className="font-semibold">Required:</p>
            <p>Must have a "Keyword" column</p>
          </div>
          <div>
            <p className="font-semibold">Supported columns:</p>
            <p className="text-gray-400">
              All columns will be imported as-is. Typical columns include:
              Currency, Avg. monthly searches, Three month change, YoY change,
              Competition, Competition (indexed value), Top of page bids,
              and monthly search columns (Searches: MMM YYYY)
            </p>
          </div>
          <div className="mt-2">
            <p className="text-gray-400 italic">
              Note: First two rows (title and date) will be skipped automatically
            </p>
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
          accept=".csv,.tsv,.txt"
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
