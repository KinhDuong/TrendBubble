import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/Header';
import Footer from '../components/Footer';
import KeywordChart from '../components/KeywordChart';
import BubbleChart, { Shape } from '../components/BubbleChart';
import BarChart from '../components/BarChart';
import Treemap from '../components/Treemap';
import DonutChart from '../components/DonutChart';
import FilterMenu, { BubbleLayout, ViewMode, Shape as FilterShape } from '../components/FilterMenu';
import ShareSnapshot from '../components/ShareSnapshot';
import AnimationSelector, { AnimationStyle } from '../components/AnimationSelector';
import ComparisonPanel from '../components/ComparisonPanel';
import BrandKeywordUpload from '../components/BrandKeywordUpload';
import ToolSchema from '../components/ToolSchema';
import BubbleTooltip from '../components/BubbleTooltip';
import AdvertisingRecommendations from '../components/AdvertisingRecommendations';
import SEOStrategyInsights from '../components/SEOStrategyInsights';
import PPCCampaignInsights from '../components/PPCCampaignInsights';
import { TrendingTopic, FAQ } from '../types';
import { TrendingUp, Download, ArrowLeft, Search, X, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown, Sparkles, AlertCircle } from 'lucide-react';

type SortField = 'name' | 'searchVolume' | 'rank' | 'month' | 'threeMonth' | 'yoy';
type SortDirection = 'asc' | 'desc';

interface MonthlyData {
  id: string;
  brand: string;
  month: string;
  total_volume: number;
  keyword_count: number;
  top_keywords: Array<{ keyword: string; volume: number }>;
}

interface BrandPageData {
  id: string;
  brand: string;
  meta_title: string;
  meta_description: string;
  intro_text?: string;
  summary?: string;
  faq?: string;
  cover_image?: string;
  created_at: string;
  updated_at: string;
}

interface LatestBrandPage {
  id: string;
  brand: string;
  meta_title: string;
  meta_description: string;
  created_at: string;
}

export default function BrandInsightPage() {
  const { userId: pageIdOrUserId, brandName } = useParams<{ userId: string; brandName: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [keywordData, setKeywordData] = useState<any[]>([]);
  const [monthColumns, setMonthColumns] = useState<string[]>([]);
  const [brandPageData, setBrandPageData] = useState<BrandPageData | null>(null);
  const [latestBrandPages, setLatestBrandPages] = useState<LatestBrandPage[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageOwnerId, setPageOwnerId] = useState<string | null>(null);
  const [pageOwnerUsername, setPageOwnerUsername] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiErrorCode, setAiErrorCode] = useState<string | null>(null);
  const [aiAnalysisDate, setAiAnalysisDate] = useState<string | null>(null);
  const [aiSaveStatus, setAiSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const getInitialMaxBubbles = () => {
    const topParam = searchParams.get('Top');
    if (topParam) {
      const parsed = parseInt(topParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return 999999;
  };

  const [maxBubbles, setMaxBubbles] = useState<number>(getInitialMaxBubbles());
  const [viewMode, setViewMode] = useState<ViewMode>('bubble');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [topSearchQuery, setTopSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<SortField>('searchVolume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [rankingSortField, setRankingSortField] = useState<SortField>('rank');
  const [rankingSortDirection, setRankingSortDirection] = useState<SortDirection>('asc');
  const [comparingTopics, setComparingTopics] = useState<Set<string>>(new Set());
  const [pinnedTopics, setPinnedTopics] = useState<Set<string>>(new Set());
  const [tooltipData, setTooltipData] = useState<{ topic: TrendingTopic; x: number; y: number; rank: number } | null>(null);
  const [bubbleLayout, setBubbleLayout] = useState<BubbleLayout>('force');
  const [shape, setShape] = useState<FilterShape>('bubble');
  const [animationStyle, setAnimationStyle] = useState<AnimationStyle>('default');
  const [performanceFilter, setPerformanceFilter] = useState<string>('all');
  const [rankingListFilter, setRankingListFilter] = useState<string>('all');

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';
  });

  const bubbleChartRef = useRef<HTMLDivElement>(null);
  const treemapChartRef = useRef<HTMLDivElement>(null);
  const donutChartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);

  const itemsPerPage = 10;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.documentElement.style.backgroundColor = theme === 'dark' ? '#111827' : '#f1f3f4';
  }, [theme]);

  useEffect(() => {
    const pathname = location.pathname;
    const hasTrailingSlash = pathname.endsWith('/');

    if (!hasTrailingSlash) {
      const search = location.search;
      navigate(pathname + '/' + search, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    const topParam = searchParams.get('Top');
    if (topParam) {
      const parsed = parseInt(topParam, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed !== maxBubbles) {
        setMaxBubbles(parsed);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (brandName && pageIdOrUserId) {
      loadAllData();
    }
  }, [brandName, pageIdOrUserId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, topSearchQuery, rankingListFilter]);

  useEffect(() => {
    if (viewMode === 'bubble') {
      setPerformanceFilter('top-per-category');
    } else {
      setPerformanceFilter('all');
    }
  }, [viewMode]);

  const loadAllData = async () => {
    setLoading(true);
    if (!pageIdOrUserId) {
      setLoading(false);
      return;
    }

    const brandPageData = await loadBrandPageData();
    if (!brandPageData) {
      setLoading(false);
      return;
    }

    setPageOwnerId(brandPageData.user_id);

    await Promise.all([
      loadMonthColumns(),
      loadBrandData(brandPageData.user_id),
      loadKeywordData(brandPageData.user_id),
      loadLatestBrandPages(brandPageData.user_id),
      loadAIAnalysis(brandPageData.user_id)
    ]);
    setLoading(false);
  };

  const loadMonthColumns = async () => {
    try {
      // Fetch one row to get all column names
      const { data, error } = await supabase
        .from('brand_keyword_data')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading month columns:', error);
        return;
      }

      if (data) {
        // Extract all column names that start with "Searches:"
        const searchColumns = Object.keys(data).filter(key => key.startsWith('Searches:'));

        // Sort columns chronologically
        const sortedColumns = searchColumns.sort((a, b) => {
          const monthOrder: { [key: string]: number } = {
            'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
            'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
          };

          const parseColumn = (col: string) => {
            const parts = col.replace('Searches: ', '').split(' ');
            const month = parts[0];
            const year = parseInt(parts[1]);
            return { year, month: monthOrder[month] || 0 };
          };

          const aData = parseColumn(a);
          const bData = parseColumn(b);

          if (aData.year !== bData.year) {
            return aData.year - bData.year;
          }
          return aData.month - bData.month;
        });

        setMonthColumns(sortedColumns);
      }
    } catch (error) {
      console.error('Error loading month columns:', error);
    }
  };

  const loadBrandData = async (ownerUserId?: string) => {
    const userIdToUse = ownerUserId || pageOwnerId;
    if (!brandName || !userIdToUse) return;

    try {
      const decodedBrand = decodeURIComponent(brandName);

      const { data, error } = await supabase
        .from('brand_keyword_monthly_data')
        .select('*')
        .eq('brand', decodedBrand)
        .eq('user_id', userIdToUse)
        .order('month', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setMonthlyData(data);
      } else {
        setMonthlyData([]);
      }
    } catch (error) {
      console.error('Error loading brand data:', error);
      setMonthlyData([]);
    }
  };

  const loadKeywordData = async (ownerUserId?: string) => {
    const userIdToUse = ownerUserId || pageOwnerId;
    if (!brandName || !userIdToUse) return;

    try {
      const decodedBrand = decodeURIComponent(brandName);

      const { data, error } = await supabase
        .from('brand_keyword_data')
        .select('*')
        .eq('brand', decodedBrand)
        .eq('user_id', userIdToUse)
        .limit(5000);

      if (error) throw error;

      if (data && data.length > 0) {
        setKeywordData(data);
      } else {
        setKeywordData([]);
      }
    } catch (error) {
      console.error('Error loading keyword data:', error);
      setKeywordData([]);
    }
  };

  const loadBrandPageData = async (): Promise<BrandPageData & { user_id: string } | null> => {
    if (!brandName || !pageIdOrUserId) return null;

    try {
      const decodedBrand = decodeURIComponent(brandName);
      const decodedPageIdOrUserId = decodeURIComponent(pageIdOrUserId);

      let data;
      let error;

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedPageIdOrUserId);

      if (isUUID) {
        const brandPageResult = await supabase
          .from('brand_pages')
          .select('*, user_id')
          .eq('id', decodedPageIdOrUserId)
          .maybeSingle();

        if (brandPageResult.data) {
          data = brandPageResult.data;
          error = brandPageResult.error;
        } else {
          const result = await supabase
            .from('brand_pages')
            .select('*, user_id')
            .eq('user_id', decodedPageIdOrUserId)
            .eq('brand', decodedBrand)
            .maybeSingle();
          data = result.data;
          error = result.error;
        }
      } else {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, username')
          .eq('username', decodedPageIdOrUserId)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profileData) {
          return null;
        }

        setPageOwnerUsername(profileData.username);

        const result = await supabase
          .from('brand_pages')
          .select('*, user_id')
          .eq('user_id', profileData.id)
          .eq('brand', decodedBrand)
          .maybeSingle();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      if (data) {
        setBrandPageData(data);
        await loadFAQs(data.id);

        if (!pageOwnerUsername) {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('username')
            .eq('id', data.user_id)
            .maybeSingle();

          if (profileData) {
            setPageOwnerUsername(profileData.username);
          }
        }

        return data as BrandPageData & { user_id: string };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error loading brand page data:', error);
      return null;
    }
  };

  const loadFAQs = async (pageId: string) => {
    try {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('page_id', pageId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error('Error loading FAQs:', error);
      setFaqs([]);
    }
  };

  const loadLatestBrandPages = async (ownerUserId?: string) => {
    const userIdToUse = ownerUserId || pageOwnerId;
    if (!userIdToUse) return;

    try {
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('brand_keyword_monthly_data')
        .select('brand, created_at')
        .eq('user_id', userIdToUse)
        .order('created_at', { ascending: false });

      if (monthlyError) throw monthlyError;

      const brandMap = new Map<string, { brand: string; created_at: string }>();

      monthlyData?.forEach((item) => {
        if (!brandMap.has(item.brand) || item.created_at > brandMap.get(item.brand)!.created_at) {
          brandMap.set(item.brand, item);
        }
      });

      const uniqueBrands = Array.from(brandMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      const brandsWithMetadata = await Promise.all(
        uniqueBrands.map(async (item) => {
          const { data: pageData } = await supabase
            .from('brand_pages')
            .select('id, brand, meta_title, meta_description, created_at')
            .eq('user_id', userIdToUse)
            .eq('brand', item.brand)
            .maybeSingle();

          if (pageData) {
            return pageData;
          }

          return {
            id: `default-${item.brand}`,
            brand: item.brand,
            meta_title: `${item.brand} Keyword Insights`,
            meta_description: `Explore search trends and keyword analysis for ${item.brand}`,
            created_at: item.created_at
          };
        })
      );

      setLatestBrandPages(brandsWithMetadata);
    } catch (error) {
      console.error('Error loading latest brand pages:', error);
    }
  };

  const loadAIAnalysis = async (ownerUserId?: string) => {
    const userIdToUse = ownerUserId || pageOwnerId;
    if (!brandName || !userIdToUse) return;

    try {
      const decodedBrand = decodeURIComponent(brandName);

      // Try to get user-specific analysis first, fallback to null user_id (legacy records)
      const { data, error } = await supabase
        .from('brand_ai_analysis')
        .select('*')
        .eq('brand', decodedBrand)
        .or(`user_id.eq.${userIdToUse},user_id.is.null`)
        .order('user_id', { ascending: false, nullsLast: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAiAnalysis(data.analysis);
        setAiAnalysisDate(data.updated_at);
        setAiError(null);
        setAiErrorCode(null);
      }
    } catch (error) {
      console.error('Error loading AI analysis:', error);
    }
  };

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.style.backgroundColor = newTheme === 'dark' ? '#111827' : '#f1f3f4';
  };

  const handleMaxBubblesChange = (newMax: number) => {
    setMaxBubbles(newMax);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('Top', newMax.toString());
    setSearchParams(newSearchParams, { replace: true });
  };

  const handleTogglePin = (topicName: string) => {
    setPinnedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topicName)) {
        newSet.delete(topicName);
      } else {
        newSet.add(topicName);
      }
      return newSet;
    });
  };

  const handleToggleCompare = (topicName: string) => {
    setComparingTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topicName)) {
        newSet.delete(topicName);
      } else {
        if (newSet.size >= 5) {
          return prev;
        }
        newSet.add(topicName);
      }
      return newSet;
    });
  };

  const transformToTopics = useMemo((): TrendingTopic[] => {
    try {
      if (!keywordData || keywordData.length === 0 || monthColumns.length === 0) {
        return [];
      }

      const now = new Date().toISOString();

      const result = keywordData.map(kw => {
        const monthlyVolumes: number[] = [];

        monthColumns.forEach(col => {
          if (kw[col] !== null && kw[col] !== undefined) {
            monthlyVolumes.push(Number(kw[col]));
          }
        });

        const maxVolume = monthlyVolumes.length > 0 ? Math.max(...monthlyVolumes) : (kw['Avg. monthly searches'] || 0);

        return {
          name: kw.keyword,
          searchVolume: maxVolume,
          searchVolumeRaw: maxVolume.toLocaleString(),
          url: '',
          createdAt: now,
          pubDate: now,
          category: kw.brand || '',
          source: 'brand_keywords',
          monthlySearches: monthlyVolumes.map((vol, idx) => ({
            month: monthColumns[idx],
            volume: vol
          }))
        };
      }).sort((a, b) => b.searchVolume - a.searchVolume);

      console.log('BrandInsightPage - transformToTopics:', {
        keywordDataCount: keywordData.length,
        resultCount: result.length,
        sampleData: result.slice(0, 3)
      });
      return result;
    } catch (error) {
      console.error('Error transforming topics:', error);
      return [];
    }
  }, [keywordData, monthColumns]);

  const keywordPerformanceData = useMemo(() => {
    try {
      if (!keywordData || keywordData.length === 0 || monthColumns.length === 0) {
        return [];
      }

      const result = keywordData.map(kw => {
        const monthlySearches: number[] = [];

        monthColumns.forEach(col => {
          if (kw[col] !== null && kw[col] !== undefined) {
            monthlySearches.push(Number(kw[col]));
          }
        });

        return {
          keyword: kw.keyword,
          three_month_change: kw['Three month change'],
          yoy_change: kw['YoY change'],
          monthly_searches: monthlySearches,
          bid_high: kw['Top of page bid (high range)'],
          competition: kw.competition,
          searchVolume: kw['Avg. monthly searches'] || 0,
          ai_insights: kw.ai_insights,
          sentiment: kw.sentiment
        };
      });
      console.log('BrandInsightPage - keywordPerformanceData sample:', result.slice(0, 5));
      return result;
    } catch (error) {
      console.error('Error processing keyword performance data:', error);
      return [];
    }
  }, [keywordData, monthColumns]);

  const availableMonthsCount = useMemo(() => {
    if (keywordData.length === 0 || monthColumns.length === 0) return 0;

    const sampleKeyword = keywordData[0];
    let count = 0;
    monthColumns.forEach(col => {
      if (sampleKeyword[col] !== null && sampleKeyword[col] !== undefined) {
        count++;
      }
    });

    return count;
  }, [keywordData, monthColumns]);

  const hasYoYData = availableMonthsCount >= 24;

  // Helper function to get the exact category for a keyword (hierarchical, mutually exclusive)
  const getKeywordCategoryLabel = (topicName: string): string => {
    try {
      const parsePercentage = (value: any): number => {
        if (typeof value === 'number') return value * 100;
        if (typeof value === 'string') {
          const cleaned = value.replace('%', '').replace(',', '').trim();
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed * 100;
        }
        return 0;
      };

      const normalizedTopicName = topicName.toLowerCase().trim();
      const kwData = keywordPerformanceData.find(kw =>
        kw.keyword.toLowerCase().trim() === normalizedTopicName
      );

      if (!kwData) {
        return 'Standard';
      }

      const threeMonthChange = parsePercentage(kwData.three_month_change);
      const yoyChange = parsePercentage(kwData.yoy_change);
      const bidHigh = kwData.bid_high || 0;
      const searchVolume = kwData.searchVolume;
      const competition = kwData.competition || 'N/A';
      const competitionValue = typeof competition === 'string' ?
        (competition.toLowerCase() === 'low' ? 0.3 : competition.toLowerCase() === 'medium' ? 0.6 : 0.9) :
        competition;

      const monthlySearches = kwData.monthly_searches || [];
      const hasData = monthlySearches.length > 0;
      const mean = hasData ? monthlySearches.reduce((a, b) => a + b, 0) / monthlySearches.length : 0;
      const variance = hasData ? monthlySearches.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / monthlySearches.length : 0;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = mean > 0 ? (stdDev / mean) * 100 : 0;

      const hasGrowth = hasYoYData ? (yoyChange > 20 || threeMonthChange > 20) : threeMonthChange > 15;

      // Hierarchical categorization with early returns (mutually exclusive)
      if (hasYoYData && yoyChange > 1000) {
        return 'Ultra Growth';
      }
      if (!hasYoYData && threeMonthChange > 1000) {
        return 'Ultra Growth';
      }

      if (hasYoYData && yoyChange >= 100) {
        return 'Extreme Growth';
      }
      if (!hasYoYData && threeMonthChange >= 80) {
        return 'Extreme Growth';
      }

      if (hasYoYData && yoyChange >= 50 && yoyChange < 100) {
        return 'High Growth';
      }
      if (!hasYoYData && threeMonthChange >= 60 && threeMonthChange < 80) {
        return 'High Growth';
      }

      if (hasYoYData && yoyChange >= 40 && yoyChange < 50) {
        return 'Rising Star';
      }
      if (!hasYoYData && threeMonthChange >= 40 && threeMonthChange < 60) {
        return 'Rising Star';
      }

      if (hasYoYData && yoyChange > 30 && threeMonthChange > 20) {
        return 'Great Potential';
      }

      if (!hasYoYData && threeMonthChange > 30) {
        const momentumBuilding = hasYoYData && threeMonthChange > yoyChange + 20;
        if (momentumBuilding) {
          return 'Momentum Building';
        }
        return 'Has Potential';
      }

      if (hasYoYData && threeMonthChange > yoyChange + 20 && yoyChange >= 0) {
        return 'Momentum Building';
      }

      if (hasYoYData && yoyChange >= 15 && yoyChange < 30) {
        return 'Steady Growth';
      }
      if (!hasYoYData && threeMonthChange >= 15 && threeMonthChange <= 30) {
        return 'Steady Growth';
      }

      if (threeMonthChange > 30) {
        return 'Has Potential';
      }

      if (searchVolume >= 25000 && searchVolume <= 100000 && hasGrowth) {
        return 'High Impact';
      }

      if (searchVolume >= 1000 && searchVolume <= 5000 && competitionValue < 0.4 && hasGrowth) {
        return 'Quick Win';
      }

      if (coefficientOfVariation < 40 && searchVolume >= 1000) {
        return 'Solid Performer';
      }
      if ((hasYoYData && yoyChange > 30 || threeMonthChange > 30) && searchVolume < 15000) {
        return 'Hidden Gem';
      }
      if (bidHigh > 50) {
        return 'High Value';
      }
      if (searchVolume >= 100000) {
        return 'High Volume';
      }
      if (hasYoYData && yoyChange >= 0 && threeMonthChange < -5) {
        return 'Start Declining';
      }
      if (hasYoYData && yoyChange < 0 && threeMonthChange < 0) {
        return 'Declining';
      }
      if (!hasYoYData && threeMonthChange < -10) {
        return 'Declining';
      }

      return 'Standard';
    } catch (error) {
      return 'Standard';
    }
  };

  const filteredTopics = useMemo(() => {
    try {
      console.log('BrandInsightPage - Filtering topics:', {
        totalTopics: transformToTopics.length,
        sampleTopicNames: transformToTopics.slice(0, 3).map(t => `"${t.name}"`),
        totalPerformanceData: keywordPerformanceData.length,
        samplePerformanceKeywords: keywordPerformanceData.slice(0, 3).map(k => `"${k.keyword}"`)
      });

      // Handle top-per-category filter
      if (performanceFilter === 'top-per-category') {
        const matchingTopics = transformToTopics.filter(topic => {
          const matchesSearch = !searchQuery || topic.name.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesSearch;
        });

        // Group topics by their category
        const categoryGroups = new Map<string, TrendingTopic[]>();
        matchingTopics.forEach(topic => {
          const categoryLabel = getKeywordCategoryLabel(topic.name);
          if (!categoryGroups.has(categoryLabel)) {
            categoryGroups.set(categoryLabel, []);
          }
          categoryGroups.get(categoryLabel)!.push(topic);
        });

        // Get top 10 from each category
        const result: TrendingTopic[] = [];
        categoryGroups.forEach((topics) => {
          const topFromCategory = topics
            .sort((a, b) => b.searchVolume - a.searchVolume)
            .slice(0, 10);
          result.push(...topFromCategory);
        });

        return result.sort((a, b) => b.searchVolume - a.searchVolume);
      }

      return transformToTopics.filter(topic => {
      const matchesSearch = !searchQuery || topic.name.toLowerCase().includes(searchQuery.toLowerCase());

      if (performanceFilter === 'all') return matchesSearch;

      // Get the exact category for this keyword
      const categoryLabel = getKeywordCategoryLabel(topic.name);

      // Map filter values to category labels
      const filterToCategoryMap: { [key: string]: string } = {
        'ultra-growth': 'Ultra Growth',
        'ultra-high-growth': 'Extreme Growth',
        'high-growth': 'High Growth',
        'rising-star': 'Rising Star',
        'great-potential': 'Great Potential',
        'steady-growth': 'Steady Growth',
        'has-potential': 'Has Potential',
        'momentum-building': 'Momentum Building',
        'high-impact': 'High Impact',
        'quick-win': 'Quick Win',
        'start-declining': 'Start Declining',
        'declining': 'Declining',
        'solid-performer': 'Solid Performer',
        'hidden-gem': 'Hidden Gem',
        'high-value': 'High Value',
        'high-volume': 'High Volume'
      };

      const targetCategory = filterToCategoryMap[performanceFilter];

      // Only show keywords that exactly match this category (mutually exclusive)
      return matchesSearch && categoryLabel === targetCategory;
      }).filter(topic => {
        const matchesSearch = !searchQuery || topic.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      });
    } catch (error) {
      console.error('Error filtering topics:', error);
      return transformToTopics.filter(topic => {
        const matchesSearch = !searchQuery || topic.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      });
    }
  }, [transformToTopics, searchQuery, performanceFilter, keywordPerformanceData, hasYoYData]);

  console.log('BrandInsightPage - Filter Results:', {
    performanceFilter,
    hasYoYData,
    transformToTopicsCount: transformToTopics.length,
    keywordPerformanceDataCount: keywordPerformanceData.length,
    filteredTopicsCount: filteredTopics.length,
    availableMonthsCount
  });

  console.log('BrandInsightPage - render state:', {
    viewMode,
    transformToTopicsLength: transformToTopics.length,
    filteredTopicsLength: filteredTopics.length,
    maxBubbles,
    loading
  });

  // Calculate category counts for all topics
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();

    transformToTopics.forEach(topic => {
      const categoryLabel = getKeywordCategoryLabel(topic.name);
      counts.set(categoryLabel, (counts.get(categoryLabel) || 0) + 1);
    });

    return counts;
  }, [transformToTopics, keywordPerformanceData, hasYoYData]);

  // Helper function to get count for a filter
  const getFilterCount = (filterId: string): number => {
    if (filterId === 'all') {
      return transformToTopics.length;
    }

    if (filterId === 'top-per-category') {
      // Count top 10 from each category
      const categoryGroups = new Map<string, number>();
      transformToTopics.forEach(topic => {
        const categoryLabel = getKeywordCategoryLabel(topic.name);
        categoryGroups.set(categoryLabel, (categoryGroups.get(categoryLabel) || 0) + 1);
      });

      let topPerCategoryCount = 0;
      categoryGroups.forEach(count => {
        topPerCategoryCount += Math.min(count, 10);
      });
      return topPerCategoryCount;
    }

    const filterToCategoryMap: { [key: string]: string } = {
      'ultra-growth': 'Ultra Growth',
      'ultra-high-growth': 'Extreme Growth',
      'high-growth': 'High Growth',
      'rising-star': 'Rising Star',
      'great-potential': 'Great Potential',
      'steady-growth': 'Steady Growth',
      'has-potential': 'Has Potential',
      'momentum-building': 'Momentum Building',
      'high-impact': 'High Impact',
      'quick-win': 'Quick Win',
      'start-declining': 'Start Declining',
      'declining': 'Declining',
      'solid-performer': 'Solid Performer',
      'hidden-gem': 'Hidden Gem',
      'high-value': 'High Value',
      'high-volume': 'High Volume'
    };

    const categoryLabel = filterToCategoryMap[filterId];
    return categoryLabel ? (categoryCounts.get(categoryLabel) || 0) : 0;
  };

  // Separate filtering for ranking list
  const rankingFilteredTopics = useMemo(() => {
    try {
      // Handle top-per-category filter
      if (rankingListFilter === 'top-per-category') {
        const matchingTopics = transformToTopics.filter(topic => {
          const matchesSearch = !topSearchQuery || topic.name.toLowerCase().includes(topSearchQuery.toLowerCase());
          return matchesSearch;
        });

        // Group topics by their category
        const categoryGroups = new Map<string, TrendingTopic[]>();
        matchingTopics.forEach(topic => {
          const categoryLabel = getKeywordCategoryLabel(topic.name);
          if (!categoryGroups.has(categoryLabel)) {
            categoryGroups.set(categoryLabel, []);
          }
          categoryGroups.get(categoryLabel)!.push(topic);
        });

        // Get top 10 from each category
        const result: TrendingTopic[] = [];
        categoryGroups.forEach((topics) => {
          const topFromCategory = topics
            .sort((a, b) => b.searchVolume - a.searchVolume)
            .slice(0, 10);
          result.push(...topFromCategory);
        });

        return result.sort((a, b) => b.searchVolume - a.searchVolume);
      }

      return transformToTopics.filter(topic => {
        const matchesSearch = !topSearchQuery || topic.name.toLowerCase().includes(topSearchQuery.toLowerCase());

        if (rankingListFilter === 'all') return matchesSearch;

        // Get the exact category for this keyword
        const categoryLabel = getKeywordCategoryLabel(topic.name);

        // Map filter values to category labels
        const filterToCategoryMap: { [key: string]: string } = {
          'ultra-growth': 'Ultra Growth',
          'ultra-high-growth': 'Extreme Growth',
          'high-growth': 'High Growth',
          'rising-star': 'Rising Star',
          'great-potential': 'Great Potential',
          'steady-growth': 'Steady Growth',
          'has-potential': 'Has Potential',
          'momentum-building': 'Momentum Building',
          'high-impact': 'High Impact',
          'quick-win': 'Quick Win',
          'start-declining': 'Start Declining',
          'declining': 'Declining',
          'solid-performer': 'Solid Performer',
          'hidden-gem': 'Hidden Gem',
          'high-value': 'High Value',
          'high-volume': 'High Volume'
        };

        const targetCategory = filterToCategoryMap[rankingListFilter];

        // Only show keywords that exactly match this category
        return matchesSearch && categoryLabel === targetCategory;
      });
    } catch (error) {
      console.error('Error filtering ranking list topics:', error);
      return transformToTopics.filter(topic => {
        const matchesSearch = !topSearchQuery || topic.name.toLowerCase().includes(topSearchQuery.toLowerCase());
        return matchesSearch;
      });
    }
  }, [transformToTopics, topSearchQuery, rankingListFilter, keywordPerformanceData, hasYoYData]);

  const topTopics = filteredTopics.filter(topic => {
    if (!topSearchQuery.trim()) return true;
    const query = topSearchQuery.toLowerCase();
    return topic.name.toLowerCase().includes(query) ||
           topic.category?.toLowerCase().includes(query);
  });

  const getKeywordCategory = (topicName: string): { label: string; emoji: string; color: string } => {
    try {
      const parsePercentage = (value: any): number => {
        if (typeof value === 'number') return value * 100;
        if (typeof value === 'string') {
          const cleaned = value.replace('%', '').replace(',', '').trim();
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed * 100;
        }
        return 0;
      };

      const normalizedTopicName = topicName.toLowerCase().trim();
      const kwData = keywordPerformanceData.find(kw =>
        kw.keyword.toLowerCase().trim() === normalizedTopicName
      );

      if (!kwData) {
        return { label: 'Standard', emoji: '📊', color: theme === 'dark' ? 'text-gray-400' : 'text-gray-600' };
      }

      const threeMonthChange = parsePercentage(kwData.three_month_change);
      const yoyChange = parsePercentage(kwData.yoy_change);
      const bidHigh = kwData.bid_high || 0;
      const searchVolume = kwData.searchVolume;
      const competition = kwData.competition || 'N/A';
      const competitionValue = typeof competition === 'string' ?
        (competition.toLowerCase() === 'low' ? 0.3 : competition.toLowerCase() === 'medium' ? 0.6 : 0.9) :
        competition;

      const monthlySearches = kwData.monthly_searches || [];
      const hasData = monthlySearches.length > 0;
      const mean = hasData ? monthlySearches.reduce((a, b) => a + b, 0) / monthlySearches.length : 0;
      const variance = hasData ? monthlySearches.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / monthlySearches.length : 0;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = mean > 0 ? (stdDev / mean) * 100 : 0;

      const hasGrowth = hasYoYData ? (yoyChange > 20 || threeMonthChange > 20) : threeMonthChange > 15;

      if (hasYoYData && yoyChange > 1000) {
        return { label: 'Ultra Growth', emoji: '🔥', color: 'text-[#FF4500]' };
      }
      if (!hasYoYData && threeMonthChange > 1000) {
        return { label: 'Ultra Growth', emoji: '🔥', color: 'text-[#FF4500]' };
      }

      if (hasYoYData && yoyChange >= 100) {
        return { label: 'Extreme Growth', emoji: '🚀', color: 'text-pink-500' };
      }
      if (!hasYoYData && threeMonthChange >= 80) {
        return { label: 'Extreme Growth', emoji: '🚀', color: 'text-pink-500' };
      }

      if (hasYoYData && yoyChange >= 50 && yoyChange < 100) {
        return { label: 'High Growth', emoji: '📈', color: 'text-green-500' };
      }
      if (!hasYoYData && threeMonthChange >= 60 && threeMonthChange < 80) {
        return { label: 'High Growth', emoji: '📈', color: 'text-green-500' };
      }

      if (hasYoYData && yoyChange >= 40 && yoyChange < 50) {
        return { label: 'Rising Star', emoji: '⭐', color: 'text-cyan-500' };
      }
      if (!hasYoYData && threeMonthChange >= 40 && threeMonthChange < 60) {
        return { label: 'Rising Star', emoji: '⭐', color: 'text-cyan-500' };
      }

      if (hasYoYData && yoyChange > 30 && threeMonthChange > 20) {
        return { label: 'Great Potential', emoji: '🎯', color: 'text-blue-500' };
      }

      if (!hasYoYData && threeMonthChange > 30) {
        const momentumBuilding = hasYoYData && threeMonthChange > yoyChange + 20;
        if (momentumBuilding) {
          return { label: 'Momentum Building', emoji: '📊', color: 'text-blue-400' };
        }
        return { label: 'Has Potential', emoji: '🌱', color: 'text-emerald-500' };
      }

      if (hasYoYData && threeMonthChange > yoyChange + 20 && yoyChange >= 0) {
        return { label: 'Momentum Building', emoji: '📊', color: 'text-blue-400' };
      }

      if (hasYoYData && yoyChange >= 15 && yoyChange < 30) {
        return { label: 'Steady Growth', emoji: '🌿', color: 'text-teal-500' };
      }
      if (!hasYoYData && threeMonthChange >= 15 && threeMonthChange <= 30) {
        return { label: 'Steady Growth', emoji: '🌿', color: 'text-teal-500' };
      }

      if (threeMonthChange > 30) {
        return { label: 'Has Potential', emoji: '🌱', color: 'text-emerald-500' };
      }

      if (searchVolume >= 25000 && searchVolume <= 100000 && hasGrowth) {
        return { label: 'High Impact', emoji: '🎯', color: 'text-orange-400' };
      }

      if (searchVolume >= 1000 && searchVolume <= 5000 && competitionValue < 0.4 && hasGrowth) {
        return { label: 'Quick Win', emoji: '⚡', color: 'text-yellow-400' };
      }

      if (coefficientOfVariation < 40 && searchVolume >= 1000) {
        return { label: 'Solid Performer', emoji: '✨', color: 'text-yellow-500' };
      }
      if ((hasYoYData && yoyChange > 30 || threeMonthChange > 30) && searchVolume < 15000) {
        return { label: 'Hidden Gem', emoji: '💎', color: 'text-purple-500' };
      }
      if (bidHigh > 50) {
        return { label: 'High Value', emoji: '👑', color: 'text-amber-500' };
      }
      if (searchVolume >= 100000) {
        return { label: 'High Volume', emoji: '🏔️', color: 'text-indigo-500' };
      }
      if (hasYoYData && yoyChange >= 0 && threeMonthChange < -5) {
        return { label: 'Start Declining', emoji: '⚠️', color: 'text-orange-500' };
      }
      if (hasYoYData && yoyChange < 0 && threeMonthChange < 0) {
        return { label: 'Declining', emoji: '📉', color: 'text-red-500' };
      }
      if (!hasYoYData && threeMonthChange < -10) {
        return { label: 'Declining', emoji: '📉', color: 'text-red-500' };
      }

      return { label: 'Standard', emoji: '📊', color: theme === 'dark' ? 'text-gray-400' : 'text-gray-600' };
    } catch (error) {
      return { label: 'Standard', emoji: '📊', color: theme === 'dark' ? 'text-gray-400' : 'text-gray-600' };
    }
  };

  const topicsWithRanks = rankingFilteredTopics.map((topic, index) => {
    const normalizedTopicName = topic.name.toLowerCase().trim();
    const kwData = keywordPerformanceData.find(kw =>
      kw.keyword.toLowerCase().trim() === normalizedTopicName
    );

    const formatPercentageDisplay = (value: any): string => {
      if (value === undefined || value === null) return 'N/A';
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(numValue)) return 'N/A';
      const percentage = numValue * 100;
      return percentage >= 0 ? `+${percentage.toFixed(1)}%` : `${percentage.toFixed(1)}%`;
    };

    const threeMonthRaw = kwData?.three_month_change;
    const yoyRaw = kwData?.yoy_change;

    return {
      ...topic,
      originalRank: index + 1,
      threeMonthChange: formatPercentageDisplay(threeMonthRaw),
      yoyChange: formatPercentageDisplay(yoyRaw),
      threeMonthRaw: threeMonthRaw !== undefined && threeMonthRaw !== null ? (typeof threeMonthRaw === 'number' ? threeMonthRaw : parseFloat(threeMonthRaw)) : null,
      yoyRaw: yoyRaw !== undefined && yoyRaw !== null ? (typeof yoyRaw === 'number' ? yoyRaw : parseFloat(yoyRaw)) : null,
      competition: kwData?.competition || 'N/A',
      bidHigh: kwData?.bid_high || 0,
      brand: topic.category,
      category: getKeywordCategory(topic.name),
      sentiment: kwData?.sentiment
    };
  });

  const parsePercentageValue = (value: string): number => {
    if (value === 'N/A') return -Infinity;
    const numStr = value.replace('%', '').replace('+', '');
    return parseFloat(numStr);
  };

  const sortedTopicsWithRanks = [...topicsWithRanks].sort((a, b) => {
    let compareResult = 0;

    switch (rankingSortField) {
      case 'name':
        compareResult = a.name.localeCompare(b.name);
        break;
      case 'threeMonth':
        const aThree = a.threeMonthRaw !== null ? a.threeMonthRaw : -Infinity;
        const bThree = b.threeMonthRaw !== null ? b.threeMonthRaw : -Infinity;
        compareResult = aThree - bThree;
        break;
      case 'yoy':
        const aYoy = a.yoyRaw !== null ? a.yoyRaw : -Infinity;
        const bYoy = b.yoyRaw !== null ? b.yoyRaw : -Infinity;
        compareResult = aYoy - bYoy;
        break;
      case 'rank':
      default:
        compareResult = a.originalRank - b.originalRank;
        break;
    }

    return rankingSortDirection === 'asc' ? compareResult : -compareResult;
  });

  const totalPages = Math.ceil(sortedTopicsWithRanks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayTopics = sortedTopicsWithRanks.slice(startIndex, endIndex);

  const handleRankingSort = (field: SortField) => {
    if (rankingSortField === field) {
      setRankingSortDirection(rankingSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setRankingSortField(field);
      setRankingSortDirection(field === 'name' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  const handleExport = async () => {
    if (!brandName) return;

    try {
      const decodedBrand = decodeURIComponent(brandName);

      const { data, error } = await supabase
        .from('brand_keyword_data')
        .select('*')
        .eq('brand', decodedBrand)
        .order('keyword', { ascending: true })
        .limit(5000);

      if (error) throw error;

      const csv = [
        ['Brand', 'Keyword', 'Avg. Monthly Searches', 'Three Month Change', 'YoY Change', 'Competition', 'Top of Page Bid (High)'].join(','),
        ...data.map(row =>
          [
            row.brand,
            row.keyword,
            row['Avg. monthly searches'] || 0,
            row['Three month change'] || '',
            row['YoY change'] || '',
            row.competition || '',
            row['Top of page bid (high range)'] || ''
          ].join(',')
        )
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${decodedBrand}-keywords.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const handleAIAnalysis = async () => {
    if (!brandName || keywordPerformanceData.length === 0) return;

    const userIdToUse = pageOwnerId;
    if (!userIdToUse) {
      setAiError('User ID not available');
      setAiErrorCode('MISSING_USER_ID');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiErrorCode(null);
    setAiSaveStatus('idle');

    try {
      const decodedBrand = decodeURIComponent(brandName);

      const keywordsForAnalysis = keywordPerformanceData.slice(0, 50).map(kw => ({
        keyword: kw.keyword,
        searchVolume: kw.searchVolume || 0,
        threeMonthChange: kw.three_month_change,
        yoyChange: kw.yoy_change,
        competition: kw.competition,
        bidHigh: kw.bid_high
      }));

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-keywords-ai`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand: decodedBrand,
          keywords: keywordsForAnalysis,
          totalMonths: availableMonthsCount,
          avgVolume
        })
      });

      const result = await response.json();

      if (result.success && result.analysis) {
        setAiAnalysis(result.analysis);
        setAiError(null);
        setAiErrorCode(null);
        setAiSaveStatus('saving');

        const { error: saveError } = await supabase
          .from('brand_ai_analysis')
          .upsert({
            brand: decodedBrand,
            analysis: result.analysis,
            keyword_count: keywordsForAnalysis.length,
            total_months: availableMonthsCount,
            avg_volume: avgVolume,
            model: 'gpt-4o',
            user_id: userIdToUse
          }, {
            onConflict: 'brand,user_id'
          });

        if (saveError) {
          console.error('Error saving AI analysis:', saveError);
          setAiSaveStatus('error');
          setTimeout(() => setAiSaveStatus('idle'), 3000);
        } else {
          setAiSaveStatus('saved');
          await loadAIAnalysis();
          setTimeout(() => setAiSaveStatus('idle'), 3000);
        }
      } else {
        setAiError(result.error || 'Failed to generate analysis');
        setAiErrorCode(result.errorCode || 'UNKNOWN_ERROR');
      }
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      setAiError(error instanceof Error ? error.message : 'Failed to generate AI analysis');
      setAiErrorCode('NETWORK_ERROR');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!keywordData.length || !brandPageData) {
    return (
      <>
        <Header
          theme={theme}
          isAdmin={isAdmin}
          isLoggedIn={!!user}
          onLoginClick={() => {}}
          onLogout={logout}
          title="Top Best Charts"
        />
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-8`}>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <TrendingUp className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <h1 className="text-4xl font-bold mb-4">Brand not found</h1>
              <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                No keyword data found for "{brandName}". The brand may not have any data uploaded yet.
              </p>
              <button
                onClick={() => navigate('/insights')}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow text-white'}`}
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Insights
              </button>
            </div>

            {isAdmin && (
              <div className="mt-12">
                <BrandKeywordUpload onUploadComplete={loadAllData} theme={theme} />
              </div>
            )}
          </div>
        </div>
        <Footer theme={theme} />
      </>
    );
  }

  const decodedBrand = decodeURIComponent(brandName || '');

  const monthlyTotals = monthColumns.map(col => {
    return keywordData.reduce((sum, kw) => sum + (Number(kw[col]) || 0), 0);
  }).filter(total => total > 0);

  const totalMonths = monthlyTotals.length;
  const avgKeywordCount = keywordData.length;
  const avgVolume = monthlyTotals.length > 0
    ? Math.round(monthlyTotals.reduce((sum, vol) => sum + vol, 0) / monthlyTotals.length)
    : 0;
  const lastUpdated = new Date();

  const baseUrl = import.meta.env.VITE_BASE_URL || 'https://topbestcharts.com';
  const pageUrl = pageOwnerUsername ? `${baseUrl}/insights/${encodeURIComponent(pageOwnerUsername)}/${encodeURIComponent(decodedBrand)}/` : `${baseUrl}/insights/`;
  const topTopicNames = topTopics.slice(0, 5).map(t => t.name).join(', ');
  const keywords = topTopics.slice(0, 10).map(t => t.name).join(', ') + ', keyword trends, search volume, SEO insights, brand analysis';

  const enhancedTitle = brandPageData.meta_title;
  const enhancedDescription = topTopicNames
    ? `${brandPageData.meta_description} Top keywords: ${topTopicNames}. Track ${avgKeywordCount} keywords across ${totalMonths} months.`
    : brandPageData.meta_description;

  return (
    <>
      <Helmet>
        <title>{enhancedTitle}</title>
        <meta name="description" content={enhancedDescription} />
        <meta name="keywords" content={keywords} />
        <meta name="author" content="Top Best Charts" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <link rel="canonical" href={pageUrl} />

        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={enhancedTitle} />
        <meta property="og:description" content={enhancedDescription} />
        <meta property="og:site_name" content="Top Best Charts" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:updated_time" content={lastUpdated.toISOString()} />
        {brandPageData.cover_image && <meta property="og:image" content={brandPageData.cover_image} />}

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={pageUrl} />
        <meta name="twitter:title" content={enhancedTitle} />
        <meta name="twitter:description" content={enhancedDescription} />
        {brandPageData.cover_image && <meta name="twitter:image" content={brandPageData.cover_image} />}

        <meta property="article:published_time" content={brandPageData.created_at} />
        <meta property="article:modified_time" content={lastUpdated.toISOString()} />
        <meta property="article:section" content="Brand Keywords" />
        <meta property="article:tag" content={topTopicNames} />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": enhancedTitle,
            "description": enhancedDescription,
            "url": pageUrl,
            "datePublished": brandPageData.created_at,
            "dateModified": lastUpdated.toISOString(),
            "author": {
              "@type": "Organization",
              "name": "Top Best Charts"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Top Best Charts",
              "url": baseUrl
            },
            "breadcrumb": {
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": baseUrl
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "Insights",
                  "item": `${baseUrl}/insights/`
                },
                {
                  "@type": "ListItem",
                  "position": 3,
                  "name": decodedBrand,
                  "item": pageUrl
                }
              ]
            },
            "mainEntity": {
              "@type": "ItemList",
              "name": "Top Keywords",
              "description": "Top keywords ranked by search volume",
              "numberOfItems": topTopics.length,
              "itemListElement": topTopics.slice(0, 10).map((topic, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                  "@type": "Thing",
                  "name": topic.name,
                  "description": `${topic.searchVolumeRaw}`
                }
              }))
            }
          })}
        </script>

        {faqs.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": faqs.map(faq => ({
                "@type": "Question",
                "name": faq.question,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": faq.answer
                }
              }))
            })}
          </script>
        )}
      </Helmet>

      <ToolSchema
        name={`${decodedBrand} Keyword Analysis Tool`}
        description={`Interactive keyword research and SEO analysis tool for ${decodedBrand}. Visualize search trends, analyze keyword performance, and track search volume data.`}
        url={pageUrl}
        applicationCategory="BusinessApplication"
        screenshot={[
          `${baseUrl}/screenshots/bubble-chart.jpg`,
          `${baseUrl}/screenshots/bar-chart.jpg`,
          `${baseUrl}/screenshots/treemap.jpg`
        ]}
      />

      <Header
        theme={theme}
        isAdmin={isAdmin}
        isLoggedIn={!!user}
        onLoginClick={() => {}}
        onLogout={logout}
        title="Top Best Charts"
      />

      <FilterMenu
        theme={theme}
        loading={loading}
        viewMode={viewMode}
        dateFilter="all"
        categoryFilter="all"
        categories={[]}
        sourceFilter="all"
        sources={[]}
        maxBubbles={maxBubbles}
        searchQuery={searchQuery}
        bubbleLayout={bubbleLayout}
        shape={shape}
        cryptoTimeframe="24h"
        showCryptoTimeframe={false}
        showDateFilter={false}
        showCategoryFilter={false}
        onViewModeChange={setViewMode}
        onDateFilterChange={() => {}}
        onCategoryFilterChange={() => {}}
        onSourceFilterChange={() => {}}
        onMaxBubblesChange={handleMaxBubblesChange}
        onThemeChange={handleThemeChange}
        onSearchQueryChange={setSearchQuery}
        onSearchClear={() => {
          setSearchQuery('');
          setViewMode('bubble');
        }}
        onBubbleLayoutChange={setBubbleLayout}
        onShapeChange={setShape}
        onCryptoTimeframeChange={() => {}}
        variant="homepage"
      />

      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} px-2 md:px-6 py-2 md:py-6 pb-0`}>
        <main role="main" aria-label="Brand keyword analysis" style={{ minHeight: '80vh' }}>
          {!loading && (
            <>
              <article className="max-w-7xl mx-auto mb-8">
                <header>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <button
                        onClick={() => navigate('/insights')}
                        className={`inline-flex items-center gap-2 text-sm mb-2 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Insights
                      </button>
                      <h1 className={`text-lg md:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {brandPageData.meta_title}
                      </h1>
                    </div>
                    {(viewMode === 'bubble' || viewMode === 'bar' || viewMode === 'treemap' || viewMode === 'donut') && transformToTopics.length > 0 && (
                      <div className="flex items-center gap-2">
                        {viewMode === 'bubble' && (
                          <AnimationSelector
                            theme={theme}
                            selectedAnimation={animationStyle}
                            onAnimationChange={setAnimationStyle}
                          />
                        )}
                        <ShareSnapshot
                          theme={theme}
                          canvasRef={
                            viewMode === 'bubble' ? bubbleChartRef :
                            viewMode === 'treemap' ? treemapChartRef :
                            viewMode === 'donut' ? donutChartRef :
                            barChartRef
                          }
                          variant="inline"
                        />
                      </div>
                    )}
                  </div>
                  <div className={`flex flex-wrap items-center gap-3 mb-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <time dateTime={lastUpdated.toISOString()}>
                      Last updated: {lastUpdated.toLocaleString('en-US', {
                        timeZone: 'America/New_York',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour12: true
                      })} ET
                    </time>
                    <button
                      onClick={handleExport}
                      className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition-all hover:scale-105 ${theme === 'dark' ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                    >
                      <Download className="w-3 h-3" />
                      Export CSV
                    </button>
                  </div>
                </header>
              </article>

              {viewMode === 'keyword' && (
                <div className="max-w-7xl mx-auto mb-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6`}>
                      <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Total Months
                      </h3>
                      <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {totalMonths}
                      </p>
                    </div>

                    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6`}>
                      <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Avg. Keywords
                      </h3>
                      <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {avgKeywordCount}
                      </p>
                    </div>

                    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6`}>
                      <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Avg. Monthly Volume
                      </h3>
                      <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {avgVolume.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {transformToTopics.length > 0 && (viewMode === 'bubble' || viewMode === 'bar' || viewMode === 'treemap' || viewMode === 'donut') && (
                <>
                  <div className="max-w-7xl mx-auto mb-6">
                    <div>
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          Filter by Performance
                        </h3>
                        <div className="flex items-center gap-2">
                          <div className={`text-xs px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                            {availableMonthsCount} months of data
                            {!hasYoYData && <span className="ml-1 text-amber-500">• Limited filters</span>}
                          </div>
                        </div>
                      </div>
                      {!hasYoYData && (
                        <div className={`mb-3 text-xs px-3 py-2 rounded-lg ${theme === 'dark' ? 'bg-amber-900/20 text-amber-400 border border-amber-800/30' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          <strong>Note:</strong> Some filters use year-over-year comparisons and require 24+ months of data. With {availableMonthsCount} months available, filters are based on 3-month trends and performance patterns.
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'all', label: 'All Keywords', emoji: '', requiresYoY: false },
                          { id: 'top-per-category', label: 'Top 10 per Category', emoji: '🎯', requiresYoY: false },
                          { id: 'ultra-growth', label: 'Ultra Growth', emoji: '🔥', requiresYoY: false },
                          { id: 'ultra-high-growth', label: 'Extreme Growth', emoji: '🚀', requiresYoY: false },
                          { id: 'high-growth', label: 'High Growth', emoji: '📈', requiresYoY: false },
                          { id: 'rising-star', label: 'Rising Star', emoji: '⭐', requiresYoY: false },
                          { id: 'great-potential', label: 'Great Potential', emoji: '🎯', requiresYoY: false },
                          { id: 'steady-growth', label: 'Steady Growth', emoji: '🌿', requiresYoY: false },
                          { id: 'has-potential', label: 'Has Potential', emoji: '🌱', requiresYoY: false },
                          { id: 'momentum-building', label: 'Momentum Building', emoji: '📊', requiresYoY: true },
                          { id: 'high-impact', label: 'High Impact', emoji: '🎯', requiresYoY: false },
                          { id: 'quick-win', label: 'Quick Win', emoji: '⚡', requiresYoY: false },
                          { id: 'solid-performer', label: 'Solid Performer', emoji: '✨', requiresYoY: false },
                          { id: 'hidden-gem', label: 'Hidden Gem', emoji: '💎', requiresYoY: false },
                          { id: 'seasonal-spike', label: 'Seasonal Spike', emoji: '🔥', requiresYoY: false },
                          { id: 'recovery', label: 'Recovery', emoji: '🔄', requiresYoY: false },
                          { id: 'high-value', label: 'High Value', emoji: '👑', requiresYoY: false },
                          { id: 'high-volume', label: 'High Volume', emoji: '🏔️', requiresYoY: false },
                          { id: 'cost-effective', label: 'Cost-Effective', emoji: '💰', requiresYoY: false },
                          { id: 'start-declining', label: 'Start Declining', emoji: '⚠️', requiresYoY: false },
                          { id: 'declining', label: 'Declining', emoji: '📉', requiresYoY: false },
                        ].filter(filter => !filter.requiresYoY || hasYoYData).map((filter) => (
                          <button
                            key={filter.id}
                            onClick={() => setPerformanceFilter(filter.id)}
                            className={`
                              px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                              ${performanceFilter === filter.id
                                ? filter.id === 'ultra-growth'
                                  ? theme === 'dark'
                                    ? 'bg-[#FF4500] text-white shadow-lg shadow-orange-500/30'
                                    : 'bg-[#FF4500] text-white shadow-md shadow-orange-500/30'
                                  : theme === 'dark'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-blue-600 text-white shadow-md'
                                : theme === 'dark'
                                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }
                            `}
                          >
                            {filter.emoji && <span className="mr-1.5">{filter.emoji}</span>}
                            {filter.label}
                            <span className={`ml-1.5 text-xs ${performanceFilter === filter.id ? 'opacity-90' : 'opacity-60'}`}>
                              ({getFilterCount(filter.id)})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {filteredTopics.length === 0 ? (
                    <div className="max-w-7xl mx-auto">
                      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-8 text-center`}>
                        <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          No keywords match the selected filter. Try a different filter or reset to "All Keywords".
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {viewMode === 'bubble' && (
                        <div ref={bubbleChartRef} style={{ minHeight: '500px' }}>
                          <BubbleChart
                          topics={filteredTopics}
                          maxDisplay={maxBubbles}
                          theme={theme}
                          layout={bubbleLayout}
                          comparingTopics={comparingTopics}
                          onComparingTopicsChange={setComparingTopics}
                          useCryptoColors={false}
                          cryptoTimeframe="24h"
                          animationStyle={animationStyle}
                          shape={shape as Shape}
                          keywordPerformanceData={keywordPerformanceData}
                        />
                        </div>
                      )}

                      {viewMode === 'bar' && (
                        <div ref={barChartRef} className="max-w-7xl mx-auto">
                          <BarChart
                            topics={filteredTopics}
                            maxDisplay={maxBubbles}
                            theme={theme}
                            useCryptoColors={false}
                            cryptoTimeframe="24h"
                            keywordPerformanceData={keywordPerformanceData}
                          />
                        </div>
                      )}

                      {viewMode === 'treemap' && (
                        <div ref={treemapChartRef} className="max-w-7xl mx-auto" style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}>
                          <Treemap
                            topics={filteredTopics}
                            maxDisplay={maxBubbles}
                            theme={theme}
                            useCryptoColors={false}
                            cryptoTimeframe="24h"
                            keywordPerformanceData={keywordPerformanceData}
                          />
                        </div>
                      )}

                      {viewMode === 'donut' && (
                        <div ref={donutChartRef} className="max-w-7xl mx-auto" style={{ height: 'calc(100vh - 300px)', minHeight: '600px' }}>
                          <DonutChart
                            topics={filteredTopics}
                            maxDisplay={maxBubbles}
                            theme={theme}
                            useCryptoColors={false}
                            cryptoTimeframe="24h"
                          />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {transformToTopics.length > 0 && (viewMode === 'bubble' || viewMode === 'bar' || viewMode === 'treemap' || viewMode === 'donut') && (
                <div className="max-w-7xl mx-auto mt-8 mb-0 md:mb-8">
                  <section className="w-full" aria-labelledby="top-keywords-heading">
                      <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-6 shadow-md`}>
                        <h2 id="top-keywords-heading" className={`text-xl md:text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          Top {rankingFilteredTopics.length} Keywords for {decodedBrand}
                        </h2>
                        {brandPageData.intro_text && (
                          <div
                            className={`mb-4 text-sm leading-relaxed rich-text-content ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                            dangerouslySetInnerHTML={{
                              __html: brandPageData.intro_text
                            }}
                          />
                        )}

                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                            <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              Filter by Performance
                            </h3>
                            <div className="flex items-center gap-2">
                              <div className={`text-xs px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                {availableMonthsCount} months of data
                                {!hasYoYData && <span className="ml-1 text-amber-500">• Limited filters</span>}
                              </div>
                            </div>
                          </div>
                          {!hasYoYData && (
                            <div className={`mb-3 text-xs px-3 py-2 rounded-lg ${theme === 'dark' ? 'bg-amber-900/20 text-amber-400 border border-amber-800/30' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                              <strong>Note:</strong> Some filters use year-over-year comparisons and require 24+ months of data. With {availableMonthsCount} months available, filters are based on 3-month trends and performance patterns.
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {[
                              { id: 'all', label: 'All Keywords', emoji: '', requiresYoY: false },
                              { id: 'top-per-category', label: 'Top 10 per Category', emoji: '🎯', requiresYoY: false },
                              { id: 'ultra-growth', label: 'Ultra Growth', emoji: '🔥', requiresYoY: false },
                              { id: 'ultra-high-growth', label: 'Extreme Growth', emoji: '🚀', requiresYoY: false },
                              { id: 'high-growth', label: 'High Growth', emoji: '📈', requiresYoY: false },
                              { id: 'rising-star', label: 'Rising Star', emoji: '⭐', requiresYoY: false },
                              { id: 'great-potential', label: 'Great Potential', emoji: '🎯', requiresYoY: false },
                              { id: 'steady-growth', label: 'Steady Growth', emoji: '🌿', requiresYoY: false },
                              { id: 'has-potential', label: 'Has Potential', emoji: '🌱', requiresYoY: false },
                              { id: 'momentum-building', label: 'Momentum Building', emoji: '📊', requiresYoY: true },
                              { id: 'high-impact', label: 'High Impact', emoji: '🎯', requiresYoY: false },
                              { id: 'quick-win', label: 'Quick Win', emoji: '⚡', requiresYoY: false },
                              { id: 'solid-performer', label: 'Solid Performer', emoji: '✨', requiresYoY: false },
                              { id: 'hidden-gem', label: 'Hidden Gem', emoji: '💎', requiresYoY: false },
                              { id: 'high-value', label: 'High Value', emoji: '👑', requiresYoY: false },
                              { id: 'high-volume', label: 'High Volume', emoji: '🏔️', requiresYoY: false },
                              { id: 'start-declining', label: 'Start Declining', emoji: '⚠️', requiresYoY: false },
                              { id: 'declining', label: 'Declining', emoji: '📉', requiresYoY: false },
                            ].filter(filter => !filter.requiresYoY || hasYoYData).map((filter) => (
                              <button
                                key={filter.id}
                                onClick={() => setRankingListFilter(filter.id)}
                                className={`
                                  px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                                  ${rankingListFilter === filter.id
                                    ? filter.id === 'ultra-growth'
                                      ? theme === 'dark'
                                        ? 'bg-[#FF4500] text-white shadow-lg shadow-orange-500/30'
                                        : 'bg-[#FF4500] text-white shadow-md shadow-orange-500/30'
                                      : theme === 'dark'
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                        : 'bg-blue-600 text-white shadow-md'
                                    : theme === 'dark'
                                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }
                                `}
                              >
                                {filter.emoji && <span className="mr-1.5">{filter.emoji}</span>}
                                {filter.label}
                                <span className={`ml-1.5 text-xs ${rankingListFilter === filter.id ? 'opacity-90' : 'opacity-60'}`}>
                                  ({getFilterCount(filter.id)})
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="relative mb-4">
                          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                          <input
                            type="text"
                            value={topSearchQuery}
                            onChange={(e) => setTopSearchQuery(e.target.value)}
                            placeholder="Search keywords"
                            className={`w-full pl-10 pr-10 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'}`}
                          />
                          {topSearchQuery && (
                            <button
                              onClick={() => setTopSearchQuery('')}
                              className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                              aria-label="Clear search"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {sortedTopicsWithRanks.length === 0 ? (
                          <div className={`rounded-lg p-8 text-center border ${theme === 'dark' ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            <p className="text-lg mb-2">
                              {topSearchQuery
                                ? `No keywords found matching "${topSearchQuery}"`
                                : 'No keywords match the selected filters'}
                            </p>
                            {topSearchQuery && (
                              <button
                                onClick={() => setTopSearchQuery('')}
                                className="mt-4 px-4 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                              >
                                Clear Search
                              </button>
                            )}
                            {!topSearchQuery && (
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                Try selecting a different filter to see results
                              </p>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className={`grid grid-cols-[auto_1fr_auto] gap-2 px-2 py-2 mb-2 border-b-2 ${theme === 'dark' ? 'border-gray-600 bg-gray-700/50' : 'border-gray-300 bg-gray-100'}`}>
                              <div className="w-8"></div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleRankingSort('name')}
                                  className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                                >
                                  Name
                                  {rankingSortField === 'name' ? (
                                    rankingSortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                                  )}
                                </button>
                              </div>
                              <div className="flex items-center gap-4">
                                <button
                                  onClick={() => handleRankingSort('threeMonth')}
                                  className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                                >
                                  3-Month
                                  {rankingSortField === 'threeMonth' ? (
                                    rankingSortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                                  )}
                                </button>
                                {hasYoYData && (
                                  <button
                                    onClick={() => handleRankingSort('yoy')}
                                    className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                                  >
                                    YoY
                                    {rankingSortField === 'yoy' ? (
                                      rankingSortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                    ) : (
                                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                            <ol className="list-none" itemScope itemType="https://schema.org/ItemList">
                              {displayTopics.map((topic, index) => (
                                <li
                                  key={index}
                                  className={`px-2 py-2.5 transition-colors cursor-pointer ${index < displayTopics.length - 1 ? `border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}` : ''} ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                                  itemProp="itemListElement"
                                  itemScope
                                  itemType="https://schema.org/ListItem"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const topicData = transformToTopics.find(t => t.name === topic.name);
                                    if (topicData) {
                                      if (topicData.url) {
                                        window.open(topicData.url, '_blank', 'noopener,noreferrer');
                                      } else {
                                        setTooltipData({
                                          topic: topicData,
                                          x: e.clientX,
                                          y: e.clientY,
                                          rank: topic.originalRank || index + 1
                                        });
                                      }
                                    }
                                  }}
                                >
                                  <meta itemProp="position" content={String(topic.originalRank)} />
                                  <article className="flex-1" itemProp="item" itemScope itemType="https://schema.org/Thing">
                                    <div className="flex items-start gap-2">
                                      <div className="w-8 flex items-center justify-center flex-shrink-0 pt-0.5" aria-label={`Rank ${topic.originalRank}`}>
                                        <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                          {topic.originalRank}
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                          <h3 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} itemProp="name">{topic.name}</h3>
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${topic.category.color}`}>
                                            <span>{topic.category.emoji}</span>
                                            <span>{topic.category.label}</span>
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                          <div>
                                            <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Volume: </span>
                                            <span className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`} itemProp="description">
                                              {topic.searchVolumeRaw}
                                            </span>
                                          </div>
                                          <div>
                                            <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>3-Month: </span>
                                            <span className={`font-semibold ${
                                              topic.threeMonthChange === 'N/A'
                                                ? theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                                : topic.threeMonthChange.toString().startsWith('-')
                                                  ? 'text-red-500'
                                                  : 'text-green-500'
                                            }`}>
                                              {topic.threeMonthChange}
                                            </span>
                                          </div>
                                          {hasYoYData && (
                                            <div>
                                              <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>YoY: </span>
                                              <span className={`font-semibold ${
                                                topic.yoyChange === 'N/A'
                                                  ? theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                                  : topic.yoyChange.toString().startsWith('-')
                                                    ? 'text-red-500'
                                                    : 'text-green-500'
                                              }`}>
                                                {topic.yoyChange}
                                              </span>
                                            </div>
                                          )}
                                          <div>
                                            <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Comp: </span>
                                            <span className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} capitalize`}>
                                              {topic.competition}
                                            </span>
                                          </div>
                                          {topic.bidHigh > 0 && (
                                            <div>
                                              <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Bid: </span>
                                              <span className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                ${topic.bidHigh.toFixed(2)}
                                              </span>
                                            </div>
                                          )}
                                          {topic.sentiment !== undefined && topic.sentiment !== null && (
                                            <div className="col-span-2 md:col-span-1">
                                              <div className="flex items-center gap-1.5">
                                                <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} text-xs`}>Sentiment:</span>
                                                <div className="flex-1 min-w-[60px]">
                                                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                      className={`h-full transition-all ${
                                                        (() => {
                                                          const percentage = ((topic.sentiment + 1) / 2) * 100;
                                                          if (percentage >= 70) return 'bg-green-500';
                                                          if (percentage >= 55) return 'bg-green-400';
                                                          if (percentage >= 45) return 'bg-yellow-400';
                                                          if (percentage >= 30) return 'bg-orange-400';
                                                          return 'bg-red-500';
                                                        })()
                                                      }`}
                                                      style={{ width: `${Math.round(((topic.sentiment + 1) / 2) * 100)}%` }}
                                                    />
                                                  </div>
                                                </div>
                                                <span className={`font-semibold text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} whitespace-nowrap`}>
                                                  {Math.round(((topic.sentiment + 1) / 2) * 100)}%
                                                </span>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </article>
                                </li>
                              ))}
                            </ol>
                            {totalPages > 1 && (
                              <div className="mt-4 flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setCurrentPage(1)}
                                  disabled={currentPage === 1}
                                  className={`px-3 py-1 rounded text-sm transition-colors ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                  title="First page"
                                >
                                  <ChevronsLeft size={16} />
                                </button>
                                <button
                                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                  disabled={currentPage === 1}
                                  className={`px-3 py-1 rounded text-sm transition-colors ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                >
                                  Previous
                                </button>
                                <span className={`px-3 py-1 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                  Page {currentPage} of {totalPages}
                                </span>
                                <button
                                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                  disabled={currentPage === totalPages}
                                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${currentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                >
                                  Next
                                </button>
                                <button
                                  onClick={() => setCurrentPage(totalPages)}
                                  disabled={currentPage === totalPages}
                                  className={`px-3 py-1 rounded text-sm transition-colors ${currentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                  title="Last page"
                                >
                                  <ChevronsRight size={16} />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </section>

                    <section className="w-full mt-6" aria-labelledby="search-volume-trends-heading">
                      <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-6 shadow-md`}>
                        <h2 id="search-volume-trends-heading" className={`text-xl md:text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          Search Volume Trends
                        </h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Chart Section */}
                          <div className="lg:col-span-2">
                            <KeywordChart data={monthlyData} selectedBrand={decodedBrand} />
                          </div>

                          {/* Overall Sentiment Section */}
                          <div className="lg:col-span-1">
                            {(() => {
                              const keywordsWithSentiment = keywordData.filter(kw => kw.sentiment !== null && kw.sentiment !== undefined);

                              if (keywordsWithSentiment.length === 0) {
                                return (
                                  <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-6 h-full flex items-center justify-center`}>
                                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-center text-sm`}>
                                      No sentiment data available
                                    </p>
                                  </div>
                                );
                              }

                              const avgSentiment = keywordsWithSentiment.reduce((sum, kw) => sum + kw.sentiment, 0) / keywordsWithSentiment.length;
                              const sentimentPercentage = Math.round(((avgSentiment + 1) / 2) * 100);

                              let sentimentLabel = 'Neutral';
                              let sentimentEmoji = '😐';

                              if (sentimentPercentage >= 70) {
                                sentimentLabel = 'Positive';
                                sentimentEmoji = '🤩';
                              } else if (sentimentPercentage >= 55) {
                                sentimentLabel = 'Somewhat Positive';
                                sentimentEmoji = '😊';
                              } else if (sentimentPercentage >= 45) {
                                sentimentLabel = 'Neutral';
                                sentimentEmoji = '😐';
                              } else if (sentimentPercentage >= 30) {
                                sentimentLabel = 'Somewhat Negative';
                                sentimentEmoji = '😕';
                              } else {
                                sentimentLabel = 'Negative';
                                sentimentEmoji = '😢';
                              }

                              return (
                                <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-6 h-full flex flex-col justify-center`}>
                                  <div className="mb-4">
                                    <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                      {sentimentEmoji} Sentiment
                                    </h3>
                                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                      Average across {keywordsWithSentiment.length} keyword{keywordsWithSentiment.length !== 1 ? 's' : ''}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                      <div className="w-full h-8 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full transition-all ${
                                            sentimentPercentage >= 70 ? 'bg-green-500' :
                                            sentimentPercentage >= 55 ? 'bg-green-400' :
                                            sentimentPercentage >= 45 ? 'bg-yellow-400' :
                                            sentimentPercentage >= 30 ? 'bg-orange-400' :
                                            'bg-red-500'
                                          }`}
                                          style={{ width: `${sentimentPercentage}%` }}
                                        />
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {sentimentPercentage}%
                                      </div>
                                      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {sentimentLabel}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </section>
                </div>
              )}

              {keywordData.length > 0 && pageOwnerId && (
                <SEOStrategyInsights
                  brandName={decodedBrand}
                  theme={theme}
                  userId={pageOwnerId}
                  isOwner={user ? (user.id === pageOwnerId || isAdmin) : false}
                />
              )}

              {keywordData.length > 0 && pageOwnerId && brandName && (
                <PPCCampaignInsights
                  brandPageSlug={brandName}
                  brandName={decodedBrand}
                  theme={theme}
                  userId={pageOwnerId}
                  isOwner={user ? (user.id === pageOwnerId || isAdmin) : false}
                />
              )}

              {keywordData.length > 0 && (
                <div className="max-w-7xl mx-auto mt-8 px-2 md:px-0">
                  <AdvertisingRecommendations
                    keywordData={keywordData}
                    brandName={decodedBrand}
                    theme={theme}
                  />
                </div>
              )}

              {keywordData.length > 0 && (
                <div className="max-w-7xl mx-auto mt-8 px-2 md:px-0">
                  <div className={`rounded-lg p-6 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className={`text-2xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            Summary and Analysis
                          </h2>
                        </div>
                        <div className="flex items-center gap-3">
                        {user && pageOwnerId && (user.id === pageOwnerId || isAdmin) && (
                          <button
                            onClick={handleAIAnalysis}
                            disabled={aiLoading}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105 whitespace-nowrap ${
                              aiLoading
                                ? theme === 'dark'
                                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : theme === 'dark'
                                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg'
                                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md'
                            }`}
                          >
                            <Sparkles className="w-4 h-4" />
                            {aiLoading ? 'Analyzing...' : aiAnalysis ? 'Regenerate' : 'Generate Advanced Insights'}
                          </button>
                        )}

                        {aiSaveStatus === 'saving' && (
                          <span className={`text-sm flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Saving...
                          </span>
                        )}
                        {aiSaveStatus === 'saved' && (
                          <span className={`text-sm flex items-center gap-1 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'} font-medium`}>
                            ✓ Saved
                          </span>
                        )}
                        {aiSaveStatus === 'error' && (
                          <span className={`text-sm flex items-center gap-1 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'} font-medium`}>
                            ✗ Save Failed
                          </span>
                        )}
                      </div>
                    </div>

                    {aiError && (
                      <div className={`mb-4 p-4 rounded-lg border ${theme === 'dark' ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-start gap-3">
                          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                          <div className="flex-1">
                            <p className={`font-semibold mb-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-700'}`}>
                              {aiErrorCode === 'MISSING_API_KEY' ? 'API Key Not Configured' :
                               aiErrorCode === 'QUOTA_EXCEEDED' ? 'Quota Exceeded' :
                               aiErrorCode === 'INVALID_API_KEY' ? 'Invalid API Key' :
                               'Analysis Failed'}
                            </p>
                            <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-red-300' : 'text-red-600'}`}>{aiError}</p>

                            {(aiErrorCode === 'MISSING_API_KEY' || aiErrorCode === 'INVALID_API_KEY' || aiErrorCode === 'QUOTA_EXCEEDED') && (
                              <div className={`mt-3 p-3 rounded-md text-sm ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white'}`}>
                                <p className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Setup Instructions:</p>
                                <ol className={`list-decimal ml-5 space-y-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                  <li className="pl-2">Get an API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">platform.openai.com/api-keys</a></li>
                                  <li className="pl-2">Go to your Supabase Dashboard → Project Settings → Edge Functions</li>
                                  <li className="pl-2">Add environment variable: <code className={`px-1 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>OPENAI_API_KEY</code></li>
                                  {aiErrorCode === 'QUOTA_EXCEEDED' && (
                                    <li className="pl-2">Check billing at <a href="https://platform.openai.com/account/billing" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">platform.openai.com/account/billing</a></li>
                                  )}
                                </ol>
                              </div>
                            )}

                            <button
                              onClick={handleAIAnalysis}
                              className={`mt-3 text-sm px-3 py-1.5 rounded-md transition-colors ${
                                theme === 'dark'
                                  ? 'bg-red-900/30 hover:bg-red-900/50 text-red-300'
                                  : 'bg-red-100 hover:bg-red-200 text-red-700'
                              }`}
                            >
                              Try Again
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {aiLoading && (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="relative">
                          <div className={`w-16 h-16 rounded-full border-4 ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'}`}></div>
                          <div className={`absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-t-blue-600 animate-spin ${theme === 'dark' ? 'border-blue-900' : 'border-blue-200'}`}></div>
                        </div>
                        <p className={`mt-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Analyzing your keyword data...
                        </p>
                        <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          This may take 10-30 seconds
                        </p>
                      </div>
                    )}

                    {aiAnalysis && !aiLoading && (
                      <div>
                        <div
                          className={`top-best-charts-content prose prose-sm max-w-none ${
                            theme === 'dark'
                              ? 'prose-invert prose-p:text-gray-300 prose-strong:text-white prose-li:text-gray-300 prose-ul:text-gray-300 prose-ol:text-gray-300'
                              : 'prose-p:text-gray-700 prose-strong:text-gray-900 prose-li:text-gray-700 prose-ul:text-gray-700 prose-ol:text-gray-700'
                          }`}
                          dangerouslySetInnerHTML={{
                            __html: (() => {
                              let html = aiAnalysis;

                              // Remove markdown headers
                              html = html.replace(/^#{1,6}\s+/gm, '');

                              // Convert bold and italic
                              html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                              html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

                              // Split into lines for list processing
                              const lines = html.split('\n');
                              const processed: string[] = [];
                              let inOrderedList = false;
                              let inNestedList = false;
                              let currentOrderedItem: string[] = [];

                              const flushOrderedItem = () => {
                                if (currentOrderedItem.length > 0) {
                                  if (inNestedList) {
                                    currentOrderedItem.push('</ul>');
                                    inNestedList = false;
                                  }
                                  processed.push('<li>' + currentOrderedItem.join('\n') + '</li>');
                                  currentOrderedItem = [];
                                }
                              };

                              for (let i = 0; i < lines.length; i++) {
                                const line = lines[i];
                                const trimmedLine = line.trim();
                                const isOrderedListItem = /^\d+\.\s+/.test(trimmedLine);
                                const isUnorderedListItem = /^[\-\*]\s+/.test(trimmedLine);

                                if (isOrderedListItem) {
                                  // Flush previous ordered item if exists
                                  flushOrderedItem();

                                  if (!inOrderedList) {
                                    processed.push('<ol>');
                                    inOrderedList = true;
                                  }

                                  const content = trimmedLine.replace(/^\d+\.\s+/, '');
                                  currentOrderedItem.push(content);
                                } else if (isUnorderedListItem && inOrderedList) {
                                  // This is a nested bullet point under a numbered item
                                  if (!inNestedList) {
                                    currentOrderedItem.push('<ul>');
                                    inNestedList = true;
                                  }
                                  const content = trimmedLine.replace(/^[\-\*]\s+/, '');
                                  currentOrderedItem.push(`<li>${content}</li>`);
                                } else if (isUnorderedListItem && !inOrderedList) {
                                  // Standalone unordered list
                                  const content = trimmedLine.replace(/^[\-\*]\s+/, '');
                                  processed.push(`<ul><li>${content}</li></ul>`);
                                } else {
                                  // Not a list item
                                  if (inOrderedList && line.trim() === '') {
                                    // Empty line might be part of list item content
                                    continue;
                                  } else if (inOrderedList && line.trim() !== '') {
                                    // Non-empty, non-list line ends the ordered list
                                    flushOrderedItem();
                                    if (inOrderedList) {
                                      processed.push('</ol>');
                                      inOrderedList = false;
                                    }
                                    processed.push(line);
                                  } else {
                                    processed.push(line);
                                  }
                                }
                              }

                              // Flush any remaining list items
                              if (inOrderedList) {
                                flushOrderedItem();
                                processed.push('</ol>');
                              }

                              html = processed.join('\n');

                              // Convert paragraphs (avoid wrapping list tags)
                              html = html.replace(/\n\n+/g, '</p><p>');
                              html = html.split('\n').map(line => {
                                const trimmed = line.trim();
                                if (!trimmed || trimmed.startsWith('<ol>') || trimmed.startsWith('</ol>') ||
                                    trimmed.startsWith('<ul>') || trimmed.startsWith('</ul>') ||
                                    trimmed.startsWith('<li>') || trimmed.startsWith('</li>')) {
                                  return line;
                                }
                                if (!line.startsWith('<p>')) {
                                  return '<p>' + line + '</p>';
                                }
                                return line;
                              }).join('\n');

                              return html;
                            })()
                          }}
                        />
                      </div>
                    )}

                    {!aiAnalysis && !aiLoading && !aiError && (
                      <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        <p className="mb-2">Click the button above to generate advanced insights about your keyword data.</p>
                        <p className="text-sm">Our analysis will identify trends, opportunities, and provide strategic recommendations.</p>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              )}

              {brandPageData.summary && (
                <section
                  className="max-w-7xl mx-auto mt-8 mb-6 px-2 md:px-0"
                  aria-labelledby="page-summary"
                  itemScope
                  itemType="https://schema.org/Article"
                >
                  <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 md:p-6`}>
                    {brandPageData.cover_image && (
                      <div className="mb-6 rounded-xl overflow-hidden">
                        <img
                          src={brandPageData.cover_image}
                          alt={brandPageData.meta_title}
                          className="w-full h-64 md:h-96 object-cover"
                        />
                      </div>
                    )}
                    <div
                      itemProp="articleBody"
                      className="summary-content"
                      dangerouslySetInnerHTML={{ __html: brandPageData.summary }}
                    />
                    <meta itemProp="author" content="Top Best Charts" />
                    <meta itemProp="datePublished" content={brandPageData.created_at} />
                  </div>
                </section>
              )}

              {brandPageData.faq && (
                <section
                  className="max-w-7xl mx-auto mt-8 mb-6 px-2 md:px-0"
                  aria-labelledby="page-faq"
                >
                  <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 md:p-6`}>
                    <div
                      className="summary-content"
                      dangerouslySetInnerHTML={{ __html: brandPageData.faq }}
                    />
                  </div>
                </section>
              )}

              {transformToTopics.length > 0 && faqs.length > 0 && (
                <section className="max-w-7xl mx-auto mt-12 mb-0 px-4 md:px-6" aria-labelledby="faq-heading">
                  <h2 id="faq-heading" className={`text-xl md:text-3xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Frequently Asked Questions
                  </h2>
                  <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Find answers to common questions about {decodedBrand} keyword trends and SEO insights.
                  </p>
                  <div className="space-y-6">
                    {faqs.map((faq) => (
                      <details key={faq.id} className={`group ${theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'} rounded-lg`}>
                        <summary className={`cursor-pointer px-6 py-4 font-semibold ${theme === 'dark' ? 'text-white hover:text-green-400' : 'text-gray-900 hover:text-green-600'} transition-colors list-none flex items-center justify-between`}>
                          <span>{faq.question}</span>
                          <span className="ml-2 text-2xl group-open:rotate-45 transition-transform">+</span>
                        </summary>
                        <div className={`px-6 pb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          <p>{faq.answer}</p>
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      <ComparisonPanel
        topics={transformToTopics.filter(t => comparingTopics.has(t.name))}
        theme={theme}
        onClose={() => setComparingTopics(new Set())}
        onRemoveTopic={(topicName) => {
          setComparingTopics(prev => {
            const next = new Set(prev);
            next.delete(topicName);
            return next;
          });
        }}
      />

      {tooltipData && (
        <BubbleTooltip
          topic={tooltipData.topic}
          x={tooltipData.x}
          y={tooltipData.y}
          rank={tooltipData.rank}
          theme={theme}
          isPinned={pinnedTopics.has(tooltipData.topic.name)}
          onTogglePin={() => handleTogglePin(tooltipData.topic.name)}
          onCompare={() => handleToggleCompare(tooltipData.topic.name)}
          isComparing={comparingTopics.has(tooltipData.topic.name)}
          onClose={() => setTooltipData(null)}
          cryptoTimeframe="24h"
          keywordData={keywordPerformanceData.find(kw => kw.keyword.toLowerCase().trim() === tooltipData.topic.name.toLowerCase().trim())}
        />
      )}

      <Footer key={`footer-${theme}`} theme={theme} />
    </>
  );
}
