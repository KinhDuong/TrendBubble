import React, { useState, useEffect } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import KeywordMergeReview from './KeywordMergeReview';
import KeywordDuplicateReview from './KeywordDuplicateReview';

interface BrandKeywordUploadProps {
  onUploadComplete: () => void;
  theme?: 'dark' | 'light';
  membershipTier?: number;
  getKeywordLimit?: (tier: number) => number;
}

interface MergeGroup {
  id: string;
  primaryKeyword: string;
  variants: string[];
  mergedData: any;
  originalData: any[];
}

interface DuplicateGroup {
  id: string;
  keywords: string[];
  sharedData: any;
}

interface ZeroTrafficKeyword {
  keyword: string;
  data: any;
}

function generateSlug(brandName: string): string {
  return brandName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function BrandKeywordUpload({ onUploadComplete, theme = 'light', membershipTier = 1, getKeywordLimit }: BrandKeywordUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>('');
  const [mergeGroups, setMergeGroups] = useState<MergeGroup[]>([]);
  const [showMergeReview, setShowMergeReview] = useState(false);
  const [pendingData, setPendingData] = useState<any[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [zeroTrafficKeywords, setZeroTrafficKeywords] = useState<ZeroTrafficKeyword[]>([]);
  const [showDuplicateReview, setShowDuplicateReview] = useState(false);
  const [currentKeywordCount, setCurrentKeywordCount] = useState<number>(0);
  const [showBrandSelector, setShowBrandSelector] = useState(false);
  const [brandSelectorKeywords, setBrandSelectorKeywords] = useState<Array<Record<string, any>>>([]);
  const [avgMonthlySearchesCache, setAvgMonthlySearchesCache] = useState<number | undefined>(undefined);
  const [representativeKeywordCache, setRepresentativeKeywordCache] = useState<string | undefined>(undefined);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

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

  const extractNumbers = (str: string): number[] => {
    const matches = str.match(/\d+/g);
    return matches ? matches.map(Number) : [];
  };

  const hasNumberMismatch = (str1: string, str2: string): boolean => {
    const nums1 = extractNumbers(str1);
    const nums2 = extractNumbers(str2);

    if (nums1.length !== nums2.length) return true;
    if (nums1.length === 0) return false;

    nums1.sort((a, b) => a - b);
    nums2.sort((a, b) => a - b);

    return !nums1.every((num, idx) => num === nums2[idx]);
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;

    if (hasNumberMismatch(str1, str2)) return 0;

    const distance = levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    return 1 - distance / maxLen;
  };

  const detectDuplicates = (data: Array<Record<string, any>>): DuplicateGroup[] => {
    const groups: DuplicateGroup[] = [];
    const dataSignatureMap = new Map<string, string[]>();

    data.forEach((record) => {
      const signature = JSON.stringify(
        Object.keys(record)
          .filter(key => key !== 'keyword')
          .sort()
          .reduce((obj, key) => {
            obj[key] = record[key];
            return obj;
          }, {} as Record<string, any>)
      );

      if (!dataSignatureMap.has(signature)) {
        dataSignatureMap.set(signature, []);
      }
      dataSignatureMap.get(signature)!.push(record.keyword);
    });

    let groupId = 1;
    dataSignatureMap.forEach((keywords, signature) => {
      if (keywords.length > 1) {
        const sharedData = JSON.parse(signature);
        groups.push({
          id: String(groupId++),
          keywords: keywords,
          sharedData: sharedData
        });
      }
    });

    return groups;
  };

  const detectZeroTrafficKeywords = (data: Array<Record<string, any>>): ZeroTrafficKeyword[] => {
    const zeroTraffic: ZeroTrafficKeyword[] = [];

    data.forEach((record) => {
      const avgSearches = record['Avg. monthly searches'];

      if (avgSearches === undefined || avgSearches === null || avgSearches === 0 || avgSearches === '') {
        zeroTraffic.push({
          keyword: record.keyword,
          data: record
        });
      }
    });

    return zeroTraffic;
  };

  const detectMergeGroups = (data: Array<Record<string, any>>): MergeGroup[] => {
    console.time('detectMergeGroups');
    const groups: MergeGroup[] = [];
    const processed = new Set<string>();
    const threshold = 0.85;

    // Pre-filter: only check keywords with same first character (case-insensitive)
    const keywordsByFirstChar = new Map<string, Array<Record<string, any>>>();
    data.forEach(record => {
      const firstChar = record.keyword[0]?.toLowerCase() || '';
      if (!keywordsByFirstChar.has(firstChar)) {
        keywordsByFirstChar.set(firstChar, []);
      }
      keywordsByFirstChar.get(firstChar)!.push(record);
    });

    data.forEach((record, i) => {
      if (processed.has(record.keyword)) return;

      const similar: any[] = [record];
      processed.add(record.keyword);

      const firstChar = record.keyword[0]?.toLowerCase() || '';
      const candidates = keywordsByFirstChar.get(firstChar) || [];

      // Only check candidates with same first character
      candidates.forEach(candidate => {
        if (processed.has(candidate.keyword)) return;
        if (candidate.keyword === record.keyword) return;

        // Quick length check: if lengths differ by more than 15%, skip
        const lenDiff = Math.abs(candidate.keyword.length - record.keyword.length);
        const maxLen = Math.max(candidate.keyword.length, record.keyword.length);
        if (lenDiff / maxLen > 0.15) return;

        const similarity = calculateSimilarity(record.keyword, candidate.keyword);

        if (similarity >= threshold) {
          similar.push(candidate);
          processed.add(candidate.keyword);
        }
      });

      if (similar.length > 1) {
        const primaryKeyword = similar.reduce((highest, current) => {
          const currentVolume = current['Avg. monthly searches'] || 0;
          const highestVolume = highest['Avg. monthly searches'] || 0;
          return currentVolume > highestVolume ? current : highest;
        }).keyword;

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

        const fieldsToAverage = new Set([
          'YoY change',
          'Three month change',
          'Competition (indexed value)',
          'Top of page bid (low range)',
          'Top of page bid (high range)'
        ]);

        numericFields.forEach(field => {
          if (fieldsToAverage.has(field)) {
            const validValues = similar
              .map(item => item[field])
              .filter(v => v !== undefined && v !== null && !isNaN(v));

            if (validValues.length > 0) {
              mergedData[field] = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
            }
          } else {
            mergedData[field] = similar.reduce((sum, item) => sum + (item[field] || 0), 0);
          }
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

    console.timeEnd('detectMergeGroups');
    console.log(`Found ${groups.length} merge groups`);
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

  const calculateYearlyAverages = (data: Array<Record<string, any>>): Array<Record<string, any>> => {
    // Find all unique years from monthly columns
    const yearsSet = new Set<string>();

    if (data.length === 0) return data;

    Object.keys(data[0]).forEach(key => {
      if (key.toLowerCase().startsWith('searches:')) {
        const match = key.match(/(\d{4})/);
        if (match) {
          yearsSet.add(match[1]);
        }
      }
    });

    const years = Array.from(yearsSet).sort();
    console.log(`Found ${years.length} unique years:`, years);

    // Calculate yearly averages for each row
    return data.map(row => {
      const enrichedRow = { ...row };

      years.forEach(year => {
        const monthlyValues: number[] = [];

        Object.keys(row).forEach(key => {
          if (key.toLowerCase().startsWith('searches:') && key.includes(year)) {
            const value = row[key];
            if (typeof value === 'number' && !isNaN(value)) {
              monthlyValues.push(value);
            }
          }
        });

        if (monthlyValues.length > 0) {
          const average = monthlyValues.reduce((sum, val) => sum + val, 0) / monthlyValues.length;
          enrichedRow[`${year} Avg`] = Math.round(average);
        }
      });

      return enrichedRow;
    });
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

    const filteredResults = results.filter(row => row.keyword);

    // Calculate yearly averages
    const enrichedResults = calculateYearlyAverages(filteredResults);
    console.log(`Added yearly average columns for each record`);

    return enrichedResults;
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

    // Check if brand already exists
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('You must be logged in to upload data');
      event.target.value = '';
      return;
    }

    const { data: existingBrand } = await supabase
      .from('brand_pages')
      .select('brand, page_id')
      .eq('user_id', user.id)
      .eq('brand', brandName.trim())
      .maybeSingle();

    if (existingBrand) {
      // Brand exists - show confirmation dialog
      setPendingFile(file);
      setShowUpdateConfirmation(true);
      event.target.value = '';
      return;
    }

    // Brand doesn't exist - proceed with upload
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
      const rawData = parseCSV(text);

      if (rawData.length === 0) {
        throw new Error('No valid data found in CSV');
      }

      // IMMEDIATELY filter out zero-traffic keywords (trash data) - they are excluded from ALL processing
      const data = rawData.filter(record => {
        const avgSearches = record['Avg. monthly searches'];
        return avgSearches !== undefined && avgSearches !== null && avgSearches !== 0 && avgSearches !== '';
      });

      const excludedCount = rawData.length - data.length;
      console.log(`✓ Filtered out ${excludedCount} zero-traffic keywords (trash)`);
      console.log(`✓ Processing ${data.length} keywords with valid traffic`);

      if (data.length === 0) {
        throw new Error('All keywords have zero traffic. Please upload a file with valid search volume data.');
      }

      // STEP 1: Brand matching - find exact match for brand name (case-insensitive)
      const brandLower = brandName.trim().toLowerCase();
      const brandMatch = data.find(record =>
        record.keyword.toLowerCase() === brandLower
      );

      let avgMonthlySearches: number | undefined;

      if (brandMatch) {
        // Use the exact match value
        avgMonthlySearches = brandMatch['Avg. monthly searches'];
        console.log(`✓ Found exact match for brand "${brandName}": ${avgMonthlySearches?.toLocaleString()} avg monthly searches`);
      } else {
        // No exact match found - show top 20 by volume + first 20 rows for user selection
        console.log(`⚠ No exact match found for brand "${brandName}"`);

        // Group 1: Top 20 by search volume
        const top20ByVolume = [...data]
          .sort((a, b) => (b['Avg. monthly searches'] || 0) - (a['Avg. monthly searches'] || 0))
          .slice(0, 20);

        // Group 2: First 20 from CSV
        const first20 = data.slice(0, 20);

        // Combine and remove duplicates (keeping top volume version)
        const keywordMap = new Map<string, Record<string, any>>();

        // Add top volume first (they take precedence)
        top20ByVolume.forEach(kw => {
          keywordMap.set(kw.keyword, { ...kw, group: 'top' });
        });

        // Add first 20, only if not already in map
        first20.forEach(kw => {
          if (!keywordMap.has(kw.keyword)) {
            keywordMap.set(kw.keyword, { ...kw, group: 'first' });
          }
        });

        const combinedKeywords = Array.from(keywordMap.values());

        setBrandSelectorKeywords(combinedKeywords);
        setPendingData(data); // Store data for later processing
        setAvgMonthlySearchesCache(undefined); // Clear cache
        setShowBrandSelector(true);
        setUploading(false);
        event.target.value = '';
        return; // Stop here, wait for user selection
      }

      // Store the brand value and keyword for later use
      setAvgMonthlySearchesCache(avgMonthlySearches);
      setRepresentativeKeywordCache(brandName.trim());

      // STEP 2: Only run duplicate detection on valid traffic keywords (zero-traffic never included)
      const detectedDuplicates = detectDuplicates(data);

      if (detectedDuplicates.length > 0) {
        setDuplicateGroups(detectedDuplicates);
        setZeroTrafficKeywords([]); // Zero-traffic keywords are NOT shown in review
        setPendingData(data); // Only valid traffic keywords
        setShowDuplicateReview(true);
        setUploading(false);
        event.target.value = '';
        return;
      }

      // STEP 3: Detect merge groups
      const detectedMerges = detectMergeGroups(data);

      if (detectedMerges.length > 0) {
        setMergeGroups(detectedMerges);
        setPendingData(data);
        setShowMergeReview(true);
        setUploading(false);
      } else {
        await processUpload(data, avgMonthlySearches, brandName.trim());
      }

      event.target.value = '';
    } catch (err) {
      console.error('Upload error details:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      setUploading(false);
    }
  };

  const handleUpdateConfirm = async () => {
    if (!pendingFile) return;

    setShowUpdateConfirmation(false);
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Use FileReader for better cross-browser encoding support
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(pendingFile, 'UTF-8');
      });
      const rawData = parseCSV(text);

      if (rawData.length === 0) {
        throw new Error('No valid data found in CSV');
      }

      // IMMEDIATELY filter out zero-traffic keywords (trash data) - they are excluded from ALL processing
      const data = rawData.filter(record => {
        const avgSearches = record['Avg. monthly searches'];
        return avgSearches !== undefined && avgSearches !== null && avgSearches !== 0 && avgSearches !== '';
      });

      const excludedCount = rawData.length - data.length;
      console.log(`✓ Filtered out ${excludedCount} zero-traffic keywords (trash)`);
      console.log(`✓ Processing ${data.length} keywords with valid traffic`);

      if (data.length === 0) {
        throw new Error('All keywords have zero traffic. Please upload a file with valid search volume data.');
      }

      // STEP 1: Brand matching - find exact match for brand name (case-insensitive)
      const brandLower = brandName.trim().toLowerCase();
      const brandMatch = data.find(record =>
        record.keyword.toLowerCase() === brandLower
      );

      let avgMonthlySearches: number | undefined;

      if (brandMatch) {
        // Use the exact match value
        avgMonthlySearches = brandMatch['Avg. monthly searches'];
        console.log(`✓ Found exact match for brand "${brandName}": ${avgMonthlySearches?.toLocaleString()} avg monthly searches`);
      } else {
        // No exact match found - show top 20 by volume + first 20 rows for user selection
        console.log(`⚠ No exact match found for brand "${brandName}"`);

        // Group 1: Top 20 by search volume
        const top20ByVolume = [...data]
          .sort((a, b) => (b['Avg. monthly searches'] || 0) - (a['Avg. monthly searches'] || 0))
          .slice(0, 20);

        // Group 2: First 20 from CSV
        const first20 = data.slice(0, 20);

        // Combine and remove duplicates (keeping top volume version)
        const keywordMap = new Map<string, Record<string, any>>();

        // Add top volume first (they take precedence)
        top20ByVolume.forEach(kw => {
          keywordMap.set(kw.keyword, { ...kw, group: 'top' });
        });

        // Add first 20, only if not already in map
        first20.forEach(kw => {
          if (!keywordMap.has(kw.keyword)) {
            keywordMap.set(kw.keyword, { ...kw, group: 'first' });
          }
        });

        const combinedKeywords = Array.from(keywordMap.values());

        setBrandSelectorKeywords(combinedKeywords);
        setPendingData(data); // Store data for later processing
        setAvgMonthlySearchesCache(undefined); // Clear cache
        setShowBrandSelector(true);
        setUploading(false);
        return; // Stop here, wait for user selection
      }

      // Store the brand value and keyword for later use
      setAvgMonthlySearchesCache(avgMonthlySearches);
      setRepresentativeKeywordCache(brandName.trim());

      // STEP 2: Only run duplicate detection on valid traffic keywords (zero-traffic never included)
      const detectedDuplicates = detectDuplicates(data);

      if (detectedDuplicates.length > 0) {
        setDuplicateGroups(detectedDuplicates);
        setZeroTrafficKeywords([]); // Zero-traffic keywords are NOT shown in review
        setPendingData(data); // Only valid traffic keywords
        setShowDuplicateReview(true);
        setUploading(false);
        return;
      }

      // STEP 3: Detect merge groups
      const detectedMerges = detectMergeGroups(data);

      if (detectedMerges.length > 0) {
        setMergeGroups(detectedMerges);
        setPendingData(data);
        setShowMergeReview(true);
        setUploading(false);
      } else {
        await processUpload(data, avgMonthlySearches, brandName.trim());
      }
    } catch (err) {
      console.error('Upload error details:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      setUploading(false);
    } finally {
      setPendingFile(null);
    }
  };

  const handleUpdateCancel = () => {
    setShowUpdateConfirmation(false);
    setPendingFile(null);
    setError(null);
  };

  const handleMergeApproval = async (approvedMerges: MergeGroup[]) => {
    setShowMergeReview(false);
    setUploading(true);

    try {
      const finalData = applyMerges(pendingData, approvedMerges);
      await processUpload(finalData, avgMonthlySearchesCache, representativeKeywordCache);
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
    setAvgMonthlySearchesCache(undefined);
    setRepresentativeKeywordCache(undefined);
    setUploading(false);
  };

  const handleDuplicateReviewContinue = async (filteredData: Array<Record<string, any>>) => {
    setShowDuplicateReview(false);
    setUploading(true);

    try {
      const detectedMerges = detectMergeGroups(filteredData);

      if (detectedMerges.length > 0) {
        setMergeGroups(detectedMerges);
        setPendingData(filteredData);
        setShowMergeReview(true);
        setUploading(false);
      } else {
        await processUpload(filteredData, avgMonthlySearchesCache, representativeKeywordCache);
      }
    } catch (err) {
      console.error('Duplicate review continue error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process data');
    } finally {
      setUploading(false);
      setDuplicateGroups([]);
      setZeroTrafficKeywords([]);
    }
  };

  const handleDuplicateCancel = () => {
    setShowDuplicateReview(false);
    setDuplicateGroups([]);
    setZeroTrafficKeywords([]);
    setPendingData([]);
    setAvgMonthlySearchesCache(undefined);
    setRepresentativeKeywordCache(undefined);
    setUploading(false);
  };

  const handleBrandSelection = async (selectedKeyword: Record<string, any>) => {
    setShowBrandSelector(false);
    setUploading(true);

    try {
      const selectedAvgMonthlySearches = selectedKeyword['Avg. monthly searches'];
      const selectedKeywordName = selectedKeyword.keyword;
      console.log(`✓ User selected keyword: "${selectedKeywordName}" with ${selectedAvgMonthlySearches?.toLocaleString()} avg monthly searches`);

      // Store the selected brand value and keyword name
      setAvgMonthlySearchesCache(selectedAvgMonthlySearches);
      setRepresentativeKeywordCache(selectedKeywordName);

      // Continue with duplicate detection
      const detectedDuplicates = detectDuplicates(pendingData);

      if (detectedDuplicates.length > 0) {
        setDuplicateGroups(detectedDuplicates);
        setZeroTrafficKeywords([]);
        setShowDuplicateReview(true);
        setUploading(false);
        return;
      }

      // Continue with merge detection
      const detectedMerges = detectMergeGroups(pendingData);

      if (detectedMerges.length > 0) {
        setMergeGroups(detectedMerges);
        setShowMergeReview(true);
        setUploading(false);
      } else {
        await processUpload(pendingData, selectedAvgMonthlySearches, selectedKeywordName);
        setPendingData([]);
      }
    } catch (err) {
      console.error('Brand selection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process upload');
      setUploading(false);
    } finally {
      setBrandSelectorKeywords([]);
    }
  };

  const handleBrandSelectionCancel = () => {
    setShowBrandSelector(false);
    setBrandSelectorKeywords([]);
    setPendingData([]);
    setAvgMonthlySearchesCache(undefined);
    setRepresentativeKeywordCache(undefined);
    setUploading(false);
  };

  const extractMonthlySearches = (row: Record<string, any>): number[] => {
    const monthlySearches: number[] = [];

    // Extract all "Searches: Month Year" columns
    Object.keys(row).forEach(key => {
      if (key.toLowerCase().startsWith('searches:')) {
        const value = row[key];
        if (typeof value === 'number' && !isNaN(value)) {
          monthlySearches.push(value);
        }
      }
    });

    return monthlySearches;
  };

  const calculateDemandScores = async (data: Array<Record<string, any>>): Promise<Array<Record<string, any>>> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.warn('No session found, skipping demand score calculation');
      return data;
    }

    try {
      // Prepare batch data for edge functions
      const keywordsForIntent = data.map(row => row.keyword);

      // Step 1: Classify intent for all keywords
      const intentResponse = await fetch(`${supabaseUrl}/functions/v1/classify-keyword-intent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keywords: keywordsForIntent }),
      });

      if (!intentResponse.ok) {
        console.error('Intent classification failed:', await intentResponse.text());
        return data;
      }

      const { results: intentResults } = await intentResponse.json();

      // Create intent map for quick lookup
      const intentMap = new Map<string, string>();
      intentResults.forEach((result: any) => {
        intentMap.set(result.keyword, result.intent);
      });

      // Step 2: Prepare data for demand score calculation
      const keywordsForScoring = data.map(row => {
        const monthlySearches = extractMonthlySearches(row);
        const lowBid = row['Top of page bid (low range)'] || 0;
        const highBid = row['Top of page bid (high range)'] || 0;
        const avgCpc = (lowBid + highBid) / 2;
        const competition = row['Competition (indexed value)'] || 0;
        const intentType = intentMap.get(row.keyword) || 'Informational';

        return {
          keyword: row.keyword,
          monthlySearches: monthlySearches,
          competition: competition,
          avgCpc: avgCpc,
          intentType: intentType,
        };
      });

      console.log('✓ Scoring data sample:', keywordsForScoring.slice(0, 2).map(k => ({
        keyword: k.keyword,
        monthlySearches: k.monthlySearches.length > 0 ? `${k.monthlySearches.length} months` : 'none',
        avgVolume: k.monthlySearches.length > 0 ? k.monthlySearches.reduce((a, b) => a + b, 0) / k.monthlySearches.length : 0,
        competition: k.competition,
        avgCpc: k.avgCpc,
        intentType: k.intentType
      })));

      // Step 3: Calculate demand scores
      const scoreResponse = await fetch(`${supabaseUrl}/functions/v1/calculate-demand-score`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keywords: keywordsForScoring }),
      });

      if (!scoreResponse.ok) {
        console.error('Demand score calculation failed:', await scoreResponse.text());
        return data.map(row => ({
          ...row,
          intent_type: intentMap.get(row.keyword) || 'Informational',
        }));
      }

      const { results: scoreResults } = await scoreResponse.json();

      console.log('✓ Score results sample:', scoreResults.slice(0, 3));

      // Create score map for quick lookup
      const scoreMap = new Map<string, any>();
      scoreResults.forEach((result: any) => {
        scoreMap.set(result.keyword, result);
      });

      // Step 4: Merge scores back into original data
      const scoredData = data.map(row => {
        const scoreResult = scoreMap.get(row.keyword);
        return {
          ...row,
          intent_type: scoreResult?.demandBreakdown ? intentMap.get(row.keyword) : 'Informational',
          demand_score: scoreResult?.demandScore || null,
          interest_score: scoreResult?.interestScore || null,
        };
      });

      console.log('✓ Scored data sample:', scoredData.slice(0, 3).map(d => ({
        keyword: d.keyword,
        demand_score: d.demand_score,
        interest_score: d.interest_score,
        intent_type: d.intent_type
      })));

      console.log('Demand & Interest score calculation complete');
      return scoredData;
    } catch (error) {
      console.error('Error calculating demand scores:', error);
      // Return data without scores if calculation fails
      return data;
    }
  };

  const processUpload = async (data: Array<Record<string, any>>, manualAvgMonthlySearches?: number, representativeKeyword?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('You must be logged in to upload data');
    }

    // Aggregate monthly search volumes across all keywords
    const monthlySearches: Record<string, number> = {};
    const monthColumns = Object.keys(data[0] || {}).filter(col => col.startsWith('Searches: '));

    monthColumns.forEach(col => {
      const totalVolume = data.reduce((sum, row) => {
        const volume = row[col];
        return sum + (typeof volume === 'number' ? volume : 0);
      }, 0);

      // Convert "Searches: Dec 2021" to "2021-12"
      const monthMatch = col.match(/Searches: (\w+) (\d{4})/);
      if (monthMatch) {
        const [, monthName, year] = monthMatch;
        const monthMap: Record<string, string> = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
          'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
          'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        const monthNum = monthMap[monthName];
        if (monthNum) {
          const isoMonth = `${year}-${monthNum}`;
          monthlySearches[isoMonth] = totalVolume;
        }
      }
    });

    console.log(`✓ Aggregated ${Object.keys(monthlySearches).length} months of search data`);

    // Check tier limits
    if (getKeywordLimit) {
      const keywordLimit = getKeywordLimit(membershipTier);
      if (keywordLimit !== -1 && data.length > keywordLimit) {
        const tierNames = ['', 'Free', 'Basic', 'Pro', 'Premium', 'Enterprise'];
        const nextTier = membershipTier < 5 ? membershipTier + 1 : null;
        const upgradeMessage = nextTier
          ? ` Upgrade to Tier ${nextTier} (${tierNames[nextTier]}) to upload up to ${getKeywordLimit(nextTier) === -1 ? 'unlimited' : getKeywordLimit(nextTier).toLocaleString()} keywords.`
          : '';
        throw new Error(
          `Your Tier ${membershipTier} (${tierNames[membershipTier]}) membership allows up to ${keywordLimit.toLocaleString()} keywords. ` +
          `You are trying to upload ${data.length.toLocaleString()} keywords.${upgradeMessage}`
        );
      }
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

    // Calculate demand scores for all keywords
    console.log('Calculating demand scores...');
    const scoredData = await calculateDemandScores(data);

    // Extract metrics from representative keyword AFTER scores are calculated
    let brandMetrics: {
      competition?: number;
      cpc_low?: number;
      cpc_high?: number;
      yoy_change?: number;
      three_month_change?: number;
      demand_score?: number;
      interest_score?: number;
      sentiment?: number;
    } = {};

    let actualRepresentativeKeyword = representativeKeyword;

    if (representativeKeyword) {
      // Try exact match first
      let keywordData = scoredData.find(kw =>
        kw.keyword.toLowerCase() === representativeKeyword.toLowerCase()
      );

      // If not found, try to find similar keywords
      if (!keywordData) {
        const brandLower = representativeKeyword.toLowerCase();
        const normalized = brandLower.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

        // Try to find keyword that matches when normalized (removes apostrophes, extra spaces, etc.)
        keywordData = scoredData.find(kw => {
          const kwNormalized = kw.keyword.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
          return kwNormalized === normalized;
        });

        // If still not found, find keyword that contains the brand name
        if (!keywordData) {
          keywordData = scoredData
            .filter(kw => {
              const kwLower = kw.keyword.toLowerCase();
              return kwLower.includes(brandLower) || brandLower.includes(kwLower);
            })
            .sort((a, b) => (b['Avg. monthly searches'] || 0) - (a['Avg. monthly searches'] || 0))[0];
        }

        if (keywordData) {
          actualRepresentativeKeyword = keywordData.keyword;
          console.log(`✓ Found alternative representative keyword: "${keywordData.keyword}" (searched for "${representativeKeyword}")`);
        }
      }

      if (keywordData) {
        brandMetrics = {
          competition: keywordData['Competition (indexed value)'] || null,
          cpc_low: keywordData['Top of page bid (low range)'] || null,
          cpc_high: keywordData['Top of page bid (high range)'] || null,
          yoy_change: keywordData['YoY change'] || null,
          three_month_change: keywordData['Three month change'] || null,
          demand_score: keywordData['demand_score'] || null,
          interest_score: keywordData['interest_score'] || null,
          sentiment: keywordData['sentiment'] || null,
        };
        console.log('✓ Extracted brand metrics with scores:', brandMetrics);
      } else {
        console.warn(`⚠ Representative keyword "${representativeKeyword}" not found in scored data`);
      }
    }

    const recordsToInsert = scoredData.map(row => {
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

    // Monthly data is optional - only insert if we have it
    if (aggregatedData.length > 0) {
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
    } else {
      console.log('⚠ No monthly breakdown columns found in CSV - skipping monthly data aggregation');
    }

    const baseSlug = generateSlug(brandName.trim());

    const { data: existingPage } = await supabase
      .from('brand_pages')
      .select('page_id')
      .eq('user_id', user.id)
      .eq('brand', brandName.trim())
      .maybeSingle();

    let pageId = baseSlug;

    if (!existingPage) {
      const { data: allPagesWithSlug } = await supabase
        .from('brand_pages')
        .select('page_id')
        .like('page_id', `${baseSlug}%`)
        .order('page_id');

      if (allPagesWithSlug && allPagesWithSlug.length > 0) {
        const existingPageIds = allPagesWithSlug.map(p => p.page_id);

        let suffix = 2;
        pageId = `${baseSlug}-${suffix}`;

        while (existingPageIds.includes(pageId)) {
          suffix++;
          pageId = `${baseSlug}-${suffix}`;
        }
      }
    } else {
      pageId = existingPage.page_id;
    }

    // Brand matching is now done before duplicate/merge detection
    // This parameter should always be provided at this point
    const avgMonthlySearches = manualAvgMonthlySearches;
    console.log(`✓ Using brand value: ${avgMonthlySearches?.toLocaleString()} avg monthly searches`);
    console.log(`✓ Representative keyword: "${actualRepresentativeKeyword}"`);

    const { error: brandPageError } = await supabase
      .from('brand_pages')
      .upsert({
        user_id: user.id,
        brand: brandName.trim(),
        page_id: pageId,
        avg_monthly_searches: avgMonthlySearches,
        representative_keyword: actualRepresentativeKeyword,
        competition: brandMetrics.competition,
        cpc_low: brandMetrics.cpc_low,
        cpc_high: brandMetrics.cpc_high,
        yoy_change: brandMetrics.yoy_change,
        three_month_change: brandMetrics.three_month_change,
        demand_score: brandMetrics.demand_score,
        interest_score: brandMetrics.interest_score,
        sentiment: brandMetrics.sentiment,
        monthly_searches: monthlySearches,
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

    const successMessage = aggregatedData.length > 0
      ? `Successfully uploaded data for ${brandName.trim()}: ${data.length} keywords with ${aggregatedData.length} months of trend data`
      : `Successfully uploaded data for ${brandName.trim()}: ${data.length} keywords`;

    setSuccess(successMessage);
    setAvgMonthlySearchesCache(undefined);
    setRepresentativeKeywordCache(undefined);

    setTimeout(() => {
      onUploadComplete();
    }, 500);

    setTimeout(() => {
      setBrandName('');
      setSuccess(null);
    }, 3000);
  };


  return (
    <>
      {showUpdateConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-lg shadow-xl ${
            theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}>
            <div className={`p-6 border-b ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className="text-lg font-semibold mb-2">Brand Already Exists</h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Data already exists for "<span className="font-semibold">{brandName}</span>".
                Updating will replace all existing keyword data for this brand.
              </p>
            </div>

            <div className={`p-6 flex gap-3 ${
              theme === 'dark' ? 'bg-gray-750' : 'bg-gray-50'
            }`}>
              <button
                onClick={handleUpdateCancel}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateConfirm}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {showBrandSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-3xl w-full max-h-[80vh] overflow-auto rounded-lg shadow-xl ${
            theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}>
            <div className={`sticky top-0 p-6 border-b ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h3 className="text-lg font-semibold mb-2">Select Brand Keyword</h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                No exact match found for "{brandName}". Please select which keyword represents the brand:
              </p>
            </div>

            <div className="p-6">
              {(() => {
                const topVolume = brandSelectorKeywords.filter(kw => kw.group === 'top');
                const firstRows = brandSelectorKeywords.filter(kw => kw.group === 'first');

                return (
                  <>
                    {topVolume.length > 0 && (
                      <div className="mb-6">
                        <h4 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          Top 20 by Search Volume
                        </h4>
                        <div className="space-y-2">
                          {topVolume.map((keyword, index) => (
                            <button
                              key={`top-${index}`}
                              onClick={() => handleBrandSelection(keyword)}
                              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                                theme === 'dark'
                                  ? 'border-gray-700 hover:border-blue-500 hover:bg-gray-750'
                                  : 'border-gray-200 hover:border-blue-500 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-semibold mb-1">{keyword.keyword}</div>
                                  <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Avg. Monthly Searches: {keyword['Avg. monthly searches']?.toLocaleString() || 'N/A'}
                                  </div>
                                </div>
                                {index === 0 && (
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    Highest Volume
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {firstRows.length > 0 && (
                      <div>
                        <h4 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          First 20 from CSV
                        </h4>
                        <div className="space-y-2">
                          {firstRows.map((keyword, index) => (
                            <button
                              key={`first-${index}`}
                              onClick={() => handleBrandSelection(keyword)}
                              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                                theme === 'dark'
                                  ? 'border-gray-700 hover:border-blue-500 hover:bg-gray-750'
                                  : 'border-gray-200 hover:border-blue-500 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-semibold mb-1">{keyword.keyword}</div>
                                  <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Avg. Monthly Searches: {keyword['Avg. monthly searches']?.toLocaleString() || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleBrandSelectionCancel}
                  className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'border-gray-700 hover:bg-gray-750 text-gray-300'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDuplicateReview && (
        <KeywordDuplicateReview
          duplicateGroups={duplicateGroups}
          zeroTrafficKeywords={zeroTrafficKeywords}
          allData={pendingData}
          onContinue={handleDuplicateReviewContinue}
          onCancel={handleDuplicateCancel}
          theme={theme}
        />
      )}

      {showMergeReview && (
        <KeywordMergeReview
          mergeGroups={mergeGroups}
          onApprove={handleMergeApproval}
          onCancel={handleMergeCancel}
          theme={theme}
        />
      )}

      <div className={`rounded-lg shadow-sm p-6 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
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

      {getKeywordLimit && (
        <div className={`mb-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-800 text-blue-300' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
          <p className="text-sm font-semibold mb-1">
            Membership Tier {membershipTier}
          </p>
          <p className="text-sm">
            {getKeywordLimit(membershipTier) === -1
              ? 'Unlimited keyword uploads'
              : `Upload limit: ${getKeywordLimit(membershipTier).toLocaleString()} keywords`}
          </p>
        </div>
      )}

      <label className={`flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-500 transition-colors ${
        theme === 'dark'
          ? 'border-gray-600 hover:bg-gray-750'
          : 'border-gray-300 hover:bg-gray-50'
      }`}>
        <div className="flex flex-col items-center">
          <Upload className={`w-5 h-5 mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
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
