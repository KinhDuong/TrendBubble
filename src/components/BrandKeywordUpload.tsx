import React, { useState, useEffect } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import KeywordMergeReview from './KeywordMergeReview';

interface BrandKeywordUploadProps {
  onUploadComplete: () => void;
  theme?: 'dark' | 'light';
}

interface MergeGroup {
  id: string;
  primaryKeyword: string;
  variants: string[];
  mergedData: any;
  originalData: any[];
}

export default function BrandKeywordUpload({ onUploadComplete, theme = 'light' }: BrandKeywordUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>('');
  const [mergeGroups, setMergeGroups] = useState<MergeGroup[]>([]);
  const [showMergeReview, setShowMergeReview] = useState(false);
  const [pendingData, setPendingData] = useState<any[]>([]);

  const levenshteinDistance = (str1: string, str2: string): number => {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[len1][len2];
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;

    const distance = levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    return 1 - distance / maxLen;
  };

  const detectMergeGroups = (data: Array<Record<string, any>>): MergeGroup[] => {
    const groups: MergeGroup[] = [];
    const processed = new Set<string>();
    const threshold = 0.85;

    data.forEach((record, i) => {
      if (processed.has(record.keyword)) return;

      const similar: any[] = [record];
      processed.add(record.keyword);

      for (let j = i + 1; j < data.length; j++) {
        if (processed.has(data[j].keyword)) continue;

        const similarity = calculateSimilarity(record.keyword, data[j].keyword);

        if (similarity >= threshold) {
          similar.push(data[j]);
          processed.add(data[j].keyword);
        }
      }

      if (similar.length > 1) {
        const primaryKeyword = similar.reduce((longest, current) =>
          current.keyword.length > longest.keyword.length ? current : longest
        ).keyword;

        const mergedData: any = {
          keyword: primaryKeyword,
          brand: record.brand
        };

        const numericFields = new Set<string>();
        similar.forEach(item => {
          Object.keys(item).forEach(key => {
            if (typeof item[key] === 'number' && !['user_id'].includes(key)) {
              numericFields.add(key);
            }
          });
        });

        numericFields.forEach(field => {
          mergedData[field] = similar.reduce((sum, item) => sum + (item[field] || 0), 0);
        });

        Object.keys(similar[0]).forEach(key => {
          if (!numericFields.has(key) && !['keyword', 'brand', 'user_id', 'created_at'].includes(key)) {
            const nonZeroValues = similar
              .map(item => item[key])
              .filter(v => v !== undefined && v !== null && v !== '' && v !== 0);

            if (nonZeroValues.length > 0) {
              if (typeof nonZeroValues[0] === 'number') {
                mergedData[key] = Math.max(...nonZeroValues);
              } else {
                mergedData[key] = nonZeroValues[0];
              }
            }
          }
        });

        groups.push({
          id: `merge-${i}`,
          primaryKeyword,
          variants: similar.map(s => s.keyword),
          mergedData,
          originalData: similar
        });
      }
    });

    return groups;
  };

  const applyMerges = (data: Array<Record<string, any>>, approvedMerges: MergeGroup[]): Array<Record<string, any>> => {
    const mergedKeywords = new Set<string>();
    approvedMerges.forEach(group => {
      group.variants.forEach(v => mergedKeywords.add(v));
    });

    const filtered = data.filter(record => !mergedKeywords.has(record.keyword));

    approvedMerges.forEach(group => {
      filtered.push(group.mergedData);
    });

    return filtered;
  };

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
    // Strip UTF-8 BOM if present
    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.split('\n').filter(line => line.trim());

    if (lines.length < 1) {
      throw new Error('CSV file is empty');
    }

    const detectDelimiter = (line: string): string => {
      const tabCount = (line.match(/\t/g) || []).length;
      const commaCount = (line.match(/,/g) || []).length;
      return tabCount > commaCount ? '\t' : ',';
    };

    let headerLineIndex = -1;
    let delimiter = '\t';
    let rawHeaders: string[] = [];

    for (let i = 0; i < Math.min(5, lines.length); i++) {
      delimiter = detectDelimiter(lines[i]);
      const potentialHeaders = lines[i].split(delimiter).map(h => h.replace(/^\uFEFF/, '').trim());
      const keywordIdx = potentialHeaders.findIndex(h => h.toLowerCase() === 'keyword');

      if (keywordIdx !== -1) {
        headerLineIndex = i;
        rawHeaders = potentialHeaders;
        break;
      }
    }

    if (headerLineIndex === -1) {
      const firstFewLines = lines.slice(0, 5).map((line, idx) => {
        const d = detectDelimiter(line);
        const cols = line.split(d).map(h => h.replace(/^\uFEFF/, '').trim()).join(', ');
        return `Line ${idx + 1}: ${cols}`;
      }).join('\n');

      throw new Error(`CSV must contain a "Keyword" column in the first 5 rows.\n\nFound:\n${firstFewLines}`);
    }

    const keywordIndex = rawHeaders.findIndex(h => h.toLowerCase() === 'keyword');
    const dataStartIndex = headerLineIndex + 1;

    console.log('CSV Delimiter:', delimiter === '\t' ? 'TAB' : 'COMMA');
    console.log('Header found at line:', headerLineIndex + 1);
    console.log('CSV Headers:', rawHeaders);
    console.log('Data starts at line:', dataStartIndex + 1);

    const results: Array<Record<string, any>> = [];

    lines.slice(dataStartIndex).forEach((line, lineNum) => {
      if (!line.trim()) return;

      const values = line.split(delimiter).map(v => v.trim());
      const keyword = values[keywordIndex];

      if (!keyword) return;

      const record: Record<string, any> = {
        keyword: keyword,
        brand: brandName.trim()
      };

      rawHeaders.forEach((header, index) => {
        if (index === keywordIndex) return;

        const value = values[index];
        if (!value || value === '') return;

        if (header.toLowerCase().startsWith('searches:')) {
          const cleanValue = value.replace(/,/g, '');
          const parsedValue = parseInt(cleanValue);
          if (!isNaN(parsedValue)) {
            record[header] = parsedValue;
          }
        } else if (header === 'Avg. monthly searches') {
          const cleanValue = value.replace(/,/g, '');
          const parsedValue = parseInt(cleanValue);
          if (!isNaN(parsedValue)) {
            record[header] = parsedValue;
          }
        } else if (header === 'Competition (indexed value)' ||
                   header === 'Top of page bid (low range)' ||
                   header === 'Top of page bid (high range)') {
          const parsedValue = parseFloat(value);
          if (!isNaN(parsedValue)) {
            record[header] = parsedValue;
          }
        } else if (header === 'Three month change') {
          const hasPercent = value.includes('%');
          const cleanValue = value.replace(/%/g, '').trim();
          const parsedValue = parseFloat(cleanValue);
          if (!isNaN(parsedValue)) {
            record['Three month change'] = hasPercent ? parsedValue / 100 : parsedValue;
          }
        } else if (header === 'YoY change') {
          const hasPercent = value.includes('%');
          const cleanValue = value.replace(/%/g, '').trim();
          const parsedValue = parseFloat(cleanValue);
          if (!isNaN(parsedValue)) {
            record['YoY change'] = hasPercent ? parsedValue / 100 : parsedValue;
          }
        } else {
          record[header] = value;
        }
      });

      results.push(record);
    });

    console.log(`Parsed ${results.length} records from CSV`);

    return results.filter(row => row.keyword);
  };

  const aggregateMonthlyData = (data: Array<Record<string, any>>) => {
    const monthlyMap = new Map<string, { keywords: Array<{ keyword: string; volume: number }>, totalVolume: number }>();

    data.forEach(row => {
      Object.keys(row).forEach(key => {
        if (key.toLowerCase().startsWith('searches:')) {
          const volume = row[key];
          if (volume && volume > 0) {
            const month = parseMonthFromHeader(key);
            if (month) {
              if (!monthlyMap.has(month)) {
                monthlyMap.set(month, { keywords: [], totalVolume: 0 });
              }

              const monthData = monthlyMap.get(month)!;
              monthData.keywords.push({
                keyword: row.keyword,
                volume: volume
              });
              monthData.totalVolume += volume;
            }
          }
        }
      });
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
      // Use FileReader for better cross-browser encoding support
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file, 'UTF-8');
      });
      const data = parseCSV(text);

      if (data.length === 0) {
        throw new Error('No valid data found in CSV');
      }

      const detectedMerges = detectMergeGroups(data);

      if (detectedMerges.length > 0) {
        setMergeGroups(detectedMerges);
        setPendingData(data);
        setShowMergeReview(true);
        setUploading(false);
      } else {
        await processUpload(data);
      }

      event.target.value = '';
    } catch (err) {
      console.error('Upload error details:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      setUploading(false);
    }
  };

  const handleMergeApproval = async (approvedMerges: MergeGroup[]) => {
    setShowMergeReview(false);
    setUploading(true);

    try {
      const finalData = applyMerges(pendingData, approvedMerges);
      await processUpload(finalData);
    } catch (err) {
      console.error('Merge approval error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process merges');
    } finally {
      setUploading(false);
      setPendingData([]);
      setMergeGroups([]);
    }
  };

  const handleMergeCancel = () => {
    setShowMergeReview(false);
    setPendingData([]);
    setMergeGroups([]);
    setUploading(false);
  };

  const processUpload = async (data: Array<Record<string, any>>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('You must be logged in to upload data');
    }

    console.log('Deleting existing data for brand:', brandName.trim());
    const { error: deleteError } = await supabase
      .from('brand_keyword_data')
      .delete()
      .eq('brand', brandName.trim())
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
    }

    const recordsToInsert = data.map(row => {
      const mappedRow: Record<string, any> = {};

      // Map column names to match database schema
      Object.keys(row).forEach(key => {
        if (key === 'Competition') {
          // Map 'Competition' to lowercase 'competition'
          mappedRow['competition'] = row[key];
        } else {
          mappedRow[key] = row[key];
        }
      });

      return {
        ...mappedRow,
        user_id: user.id,
        created_at: new Date().toISOString()
      };
    });

    console.log('Inserting records:', recordsToInsert.length);
    console.log('Sample record:', JSON.stringify(recordsToInsert[0], null, 2));

    const { error: insertError } = await supabase
      .from('brand_keyword_data')
      .insert(recordsToInsert);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Database error: ${insertError.message || 'Unknown error'}`);
    }

    const aggregatedData = aggregateMonthlyData(data);

    console.log('Aggregated data:', aggregatedData);

    if (aggregatedData.length === 0) {
      throw new Error('No monthly data could be aggregated. Please check that your CSV has "Searches: MMM YYYY" columns with valid data.');
    }

    const monthlyRecords = aggregatedData.map(record => ({
      ...record,
      user_id: user.id,
      created_at: new Date().toISOString()
    }));

    console.log('Inserting monthly records:', monthlyRecords);
    console.log('First record sample:', JSON.stringify(monthlyRecords[0], null, 2));

    console.log('Deleting existing monthly data for brand:', brandName.trim());
    const { error: monthlyDeleteError } = await supabase
      .from('brand_keyword_monthly_data')
      .delete()
      .eq('brand', brandName.trim())
      .eq('user_id', user.id);

    if (monthlyDeleteError) {
      console.error('Monthly delete error:', monthlyDeleteError);
    }

    const { data: insertedData, error: monthlyInsertError } = await supabase
      .from('brand_keyword_monthly_data')
      .insert(monthlyRecords)
      .select();

    if (monthlyInsertError) {
      console.error('Monthly data insert error:', monthlyInsertError);
      console.error('Error details:', JSON.stringify(monthlyInsertError, null, 2));
      throw new Error(`Failed to save monthly data: ${monthlyInsertError.message}`);
    }

    console.log('Successfully inserted monthly data:', insertedData);

    const { error: brandPageError } = await supabase
      .from('brand_pages')
      .upsert({
        user_id: user.id,
        brand: brandName.trim(),
        meta_title: `${brandName.trim()} - Keyword Search Trends & SEO Insights`,
        meta_description: `Analyze ${brandName.trim()} keyword search volume trends and SEO performance data.`,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,brand'
      });

    if (brandPageError) {
      console.error('Brand page upsert error:', brandPageError);
      throw new Error(`Failed to create brand page: ${brandPageError.message}`);
    }

    setSuccess(`Successfully uploaded data for ${brandName.trim()}: ${data.length} keywords with ${aggregatedData.length} months of trend data`);
    onUploadComplete();

    setTimeout(() => {
      setBrandName('');
      setSuccess(null);
    }, 3000);
  };


  return (
    <>
      {showMergeReview && (
        <KeywordMergeReview
          mergeGroups={mergeGroups}
          onApprove={handleMergeApproval}
          onCancel={handleMergeCancel}
          theme={theme}
        />
      )}

      <div className={`rounded-lg shadow-sm p-6 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
      <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Upload Keyword Data</h2>

      <div className="mb-4">
        <label htmlFor="brandName" className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          Brand Name *
        </label>
        <input
          id="brandName"
          type="text"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder="Enter brand name (e.g., Starbucks, Nike)"
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
        />
      </div>

      <div className="mb-4">
        <p className={`text-sm mb-2 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          Upload CSV/TSV file with keyword data
        </p>
        <div className={`text-xs space-y-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          <div>
            <p className="font-semibold">Required:</p>
            <p>Must have a "Keyword" column</p>
          </div>
          <div>
            <p className="font-semibold">Supported columns:</p>
            <p className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>
              All columns will be imported as-is. Typical columns include:
              Currency, Avg. monthly searches, Three month change, YoY change,
              Competition, Competition (indexed value), Top of page bids,
              and monthly search columns (Searches: MMM YYYY)
            </p>
          </div>
          <div className="mt-2">
            <p className={`italic ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              Note: First two rows (title and date) will be skipped automatically
            </p>
          </div>
        </div>
      </div>

      <label className={`flex items-center justify-center w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-500 transition-colors ${
        theme === 'dark'
          ? 'border-gray-600 hover:bg-gray-750'
          : 'border-gray-300 hover:bg-gray-50'
      }`}>
        <div className="flex flex-col items-center">
          <Upload className={`w-8 h-8 mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
          <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
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
        <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
          theme === 'dark'
            ? 'bg-red-900/30 border border-red-800 text-red-300'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`} />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
          theme === 'dark'
            ? 'bg-green-900/30 border border-green-800 text-green-300'
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          <CheckCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`} />
          <p className="text-sm">{success}</p>
        </div>
      )}
      </div>
    </>
  );
}
