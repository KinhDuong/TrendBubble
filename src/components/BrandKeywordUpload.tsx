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

      // Only run duplicate detection on valid traffic keywords (zero-traffic never included)
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
        await processUpload(filteredData);
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
    setUploading(false);
  };

  const handleBrandSelection = async (selectedKeyword: Record<string, any>) => {
    setShowBrandSelector(false);
    setUploading(true);

    try {
      const selectedAvgMonthlySearches = selectedKeyword['Avg. monthly searches'];
      await processUpload(pendingData, selectedAvgMonthlySearches);
    } catch (err) {
      console.error('Brand selection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process upload');
    } finally {
      setUploading(false);
      setBrandSelectorKeywords([]);
      setPendingData([]);
    }
  };

  const handleBrandSelectionCancel = () => {
    setShowBrandSelector(false);
    setBrandSelectorKeywords([]);
    setPendingData([]);
    setUploading(false);
  };

  const processUpload = async (data: Array<Record<string, any>>, manualAvgMonthlySearches?: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('You must be logged in to upload data');
    }

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

    let avgMonthlySearches: number | undefined;

    // If manually selected value is provided, use it
    if (manualAvgMonthlySearches !== undefined) {
      avgMonthlySearches = manualAvgMonthlySearches;
      console.log(`✓ Using manually selected brand value: ${avgMonthlySearches?.toLocaleString()} avg monthly searches`);
    } else {
      // Find exact match for brand name (case-insensitive)
      const brandLower = brandName.trim().toLowerCase();
      const brandMatch = data.find(record =>
        record.keyword.toLowerCase() === brandLower
      );

      if (brandMatch) {
        // Use the exact match value
        avgMonthlySearches = brandMatch['Avg. monthly searches'];
        console.log(`✓ Found exact match for brand "${brandName}": ${avgMonthlySearches?.toLocaleString()} avg monthly searches`);
      } else {
        // No exact match found - show first 10 rows for user selection
        console.log(`⚠ No exact match found for brand "${brandName}"`);
        const first10 = data.slice(0, 10);
        setBrandSelectorKeywords(first10);
        setPendingData(data); // Store data for later
        setShowBrandSelector(true);
        return; // Stop here, wait for user selection
      }
    }

    const { error: brandPageError } = await supabase
      .from('brand_pages')
      .upsert({
        user_id: user.id,
        brand: brandName.trim(),
        page_id: pageId,
        avg_monthly_searches: avgMonthlySearches,
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
    onUploadComplete();

    setTimeout(() => {
      setBrandName('');
      setSuccess(null);
    }, 3000);
  };


  return (
    <>
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
              <div className="space-y-2">
                {brandSelectorKeywords.map((keyword, index) => (
                  <button
                    key={index}
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
                          Recommended
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

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
