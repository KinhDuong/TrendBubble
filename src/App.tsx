import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import BubbleChart, { Shape } from './components/BubbleChart';
import BarChart from './components/BarChart';
import Treemap from './components/Treemap';
import DonutChart from './components/DonutChart';
import FileUpload from './components/FileUpload';
import Login from './components/Login';
import Footer from './components/Footer';
import Header from './components/Header';
import FilterMenu, { BubbleLayout, Shape as FilterShape } from './components/FilterMenu';
import ComparisonPanel from './components/ComparisonPanel';
import ShareSnapshot from './components/ShareSnapshot';
import ToolSchema from './components/ToolSchema';
import DynamicPage from './pages/DynamicPage';
import AdminPages from './pages/AdminPages';
import AdminData from './pages/AdminData';
import ExplorePage from './pages/ExplorePage';
import BrowseTopicsPage from './pages/BrowseTopicsPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import InsightPage from './pages/InsightPage';
import BrandInsightPage from './pages/BrandInsightPage';
import BrandDataManager from './pages/BrandDataManager';
import InsightsMetaPage from './pages/InsightsMetaPage';
import UploadPage from './pages/UploadPage';
import { TrendingTopic } from './types';
import { supabase } from './lib/supabase';
import { useAuth } from './hooks/useAuth';
import { LogOut, Home, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown, LogIn, X, BarChart3, FileText } from 'lucide-react';

type SortField = 'name' | 'category' | 'searchVolume' | 'rank' | 'pubDate' | 'createdAt';
type SortDirection = 'asc' | 'desc';

function HomePage() {
  const { isAdmin, logout } = useAuth();
  const location = useLocation();
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const isMobile = window.innerWidth < 768;
  const [maxBubbles, setMaxBubbles] = useState<number>(isMobile ? 40 : 50);
  const [dateFilter, setDateFilter] = useState<'now' | 'all' | '24h' | 'week' | 'month' | 'year'>('now');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('google_trends');
  const [categories, setCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'bubble' | 'bar' | 'list' | 'treemap'>('bubble');
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';
  });
  const [nextUpdateIn, setNextUpdateIn] = useState<string>('');
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [nextBubbleIn, setNextBubbleIn] = useState<string>('');
  const [bubbleProgress, setBubbleProgress] = useState<number>(0);
  const [oldestBubbleTime, setOldestBubbleTime] = useState<number | null>(null);
  const [oldestBubbleCreated, setOldestBubbleCreated] = useState<number | null>(null);
  const [oldestBubbleLifetime, setOldestBubbleLifetime] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>('searchVolume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState<string>('');
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSourceValue, setNewSourceValue] = useState<string>('');
  const [newSourceLabel, setNewSourceLabel] = useState<string>('');
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [newPageUrl, setNewPageUrl] = useState<string>('');
  const [newPageSource, setNewPageSource] = useState<string>('all');
  const [newPageTemplate, setNewPageTemplate] = useState<string>('dynamic_page');
  const [newPageMetaTitle, setNewPageMetaTitle] = useState<string>('');
  const [newPageMetaDescription, setNewPageMetaDescription] = useState<string>('');
  const [newPageSummary, setNewPageSummary] = useState<string>('');
  const [showAllPages, setShowAllPages] = useState(false);
  const [allPages, setAllPages] = useState<any[]>([]);
  const [latestPages, setLatestPages] = useState<any[]>([]);
  const [editingPage, setEditingPage] = useState<any | null>(null);
  const [editPageUrl, setEditPageUrl] = useState<string>('');
  const [editPageSource, setEditPageSource] = useState<string>('all');
  const [editPageTemplate, setEditPageTemplate] = useState<string>('dynamic_page');
  const [editPageMetaTitle, setEditPageMetaTitle] = useState<string>('');
  const [editPageMetaDescription, setEditPageMetaDescription] = useState<string>('');
  const [editPageSummary, setEditPageSummary] = useState<string>('');
  const [bubbleLayout, setBubbleLayout] = useState<BubbleLayout>('force');
  const [shape, setShape] = useState<FilterShape>('bubble');
  const [sources, setSources] = useState<Array<{value: string, label: string}>>([
    { value: 'all', label: 'All' },
    { value: 'google_trends', label: 'Google Trends' },
    { value: 'user_upload', label: 'My Uploads' }
  ]);
  const templateOptions = [
    { value: 'dynamic_page', label: 'Dynamic Page' },
    { value: 'google_trends', label: 'Google Trends' },
    { value: 'crypto', label: 'Crypto' },
    { value: 'custom', label: 'Custom' }
  ];
  const [showFullTop10, setShowFullTop10] = useState<boolean>(false);
  const [comparingTopics, setComparingTopics] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const bubbleChartRef = useRef<HTMLDivElement>(null);
  const treemapChartRef = useRef<HTMLDivElement>(null);
  const donutChartRef = useRef<HTMLDivElement>(null);
  const newSummaryRef = useRef<HTMLDivElement>(null);
  const editSummaryRef = useRef<HTMLDivElement>(null);

  const handlePaste = (e: React.ClipboardEvent, setter: (value: string) => void, ref: React.RefObject<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (html) {
      document.execCommand('insertHTML', false, html);
    } else {
      document.execCommand('insertText', false, text);
    }

    if (ref.current) {
      setter(ref.current.innerHTML);
    }
  };

  useEffect(() => {
    loadTopics();
    loadCategories();
    loadSources();
    loadLatestPages();
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const prerenderFooter = document.getElementById('prerender-footer');
    if (prerenderFooter) {
      prerenderFooter.remove();
    }
  }, []);

  useEffect(() => {
    const bubbleInterval = setInterval(() => {
      if (oldestBubbleTime && oldestBubbleCreated && oldestBubbleLifetime) {
        const now = Date.now();
        const remaining = oldestBubbleTime - now;
        const elapsed = now - oldestBubbleCreated;
        const progress = Math.min(100, Math.max(0, (elapsed / oldestBubbleLifetime) * 100));

        setBubbleProgress(progress);

        if (remaining > 0) {
          const seconds = Math.ceil(remaining / 1000);
          setNextBubbleIn(`${seconds}s`);
        } else {
          setNextBubbleIn('0s');
        }
      } else {
        setNextBubbleIn('--');
        setBubbleProgress(0);
      }
    }, 100);
    return () => clearInterval(bubbleInterval);
  }, [oldestBubbleTime, oldestBubbleCreated, oldestBubbleLifetime]);

  useEffect(() => {
    loadTopics();
  }, [dateFilter, categoryFilter, sourceFilter]);

  useEffect(() => {
    document.documentElement.style.backgroundColor = theme === 'dark' ? '#111827' : '#f1f3f4';
  }, [theme]);

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.style.backgroundColor = newTheme === 'dark' ? '#111827' : '#f1f3f4';
  };

  const updateCountdown = () => {
    const now = new Date();
    const currentHour = new Date(now);
    currentHour.setMinutes(0, 0, 0);
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);

    const diff = nextHour.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    setNextUpdateIn(`${minutes}:${seconds.toString().padStart(2, '0')}`);

    const hourDuration = 60 * 60 * 1000;
    const elapsed = now.getTime() - currentHour.getTime();
    const progress = Math.min(100, Math.max(0, (elapsed / hourDuration) * 100));
    setUpdateProgress(progress);
  };

  const handleBubbleTimingUpdate = (nextPopTime: number | null, createdTime?: number, lifetime?: number) => {
    setOldestBubbleTime(nextPopTime);
    setOldestBubbleCreated(createdTime || null);
    setOldestBubbleLifetime(lifetime || null);
  };

  const loadTopics = async () => {
    try {
      let query = supabase
        .from('trending_topics')
        .select('*');

      if (dateFilter === 'now') {
        const now = new Date();
        const recentDate = new Date();
        recentDate.setHours(now.getHours() - 12);
        query = query.gte('last_seen', recentDate.toISOString());
      } else if (dateFilter !== 'all') {
        const now = new Date();
        let startDate = new Date();

        switch (dateFilter) {
          case '24h':
            startDate.setHours(now.getHours() - 24);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }

        query = query.gte('first_seen', startDate.toISOString());
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (sourceFilter !== 'all') {
        query = query.eq('source', sourceFilter);
      }

      const { data, error } = await query.order('rank', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedTopics: TrendingTopic[] = data.map(topic => ({
          name: topic.name,
          searchVolume: topic.search_volume,
          searchVolumeRaw: topic.search_volume_raw,
          url: topic.url,
          createdAt: topic.created_at,
          pubDate: topic.pub_date,
          category: topic.category,
          source: topic.source
        }));
        setTopics(formattedTopics);
        setLastUpdated(new Date());
        setConnectionError(false);
      } else {
        setTopics([]);
      }
    } catch (error) {
      console.error('Error loading topics:', error);
      setConnectionError(true);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_categories')
        .select('name')
        .order('name');

      if (error) throw error;

      if (data) {
        const categoryNames = data.map(item => item.name);
        setCategories(categoryNames);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadSources = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_sources')
        .select('value, label')
        .order('label');

      if (error) throw error;

      const defaultSources = [
        { value: 'all', label: 'All' },
        { value: 'google_trends', label: 'Google Trends' },
        { value: 'user_upload', label: 'My Uploads' }
      ];

      if (data) {
        const customSources = data.map(item => ({ value: item.value, label: item.label }));
        setSources([...defaultSources, ...customSources]);
      } else {
        setSources(defaultSources);
      }
    } catch (error) {
      console.error('Error loading sources:', error);
    }
  };

  const saveBackup = async () => {
    try {
      const { data: currentTopics } = await supabase
        .from('trending_topics')
        .select('*')
        .order('rank', { ascending: true });

      if (!currentTopics || currentTopics.length === 0) {
        alert('No data to backup');
        return;
      }

      const backupName = `Backup ${new Date().toLocaleString()}`;
      const backupContent = JSON.stringify(currentTopics);

      const { error } = await supabase
        .from('backups')
        .insert({
          name: backupName,
          file_path: `backup_${Date.now()}.json`,
          content: backupContent
        });

      if (error) throw error;

      alert('Backup saved successfully!');
    } catch (error) {
      console.error('Error saving backup:', error);
      alert('Failed to save backup');
    }
  };


  const manualUpdate = async () => {
    try {
      setLoading(true);
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-trends`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ triggered_by: 'manual' }),
      });

      const result = await response.json();

      if (result.success) {
        await loadTopics();
        alert('Trends updated successfully!');
      } else {
        throw new Error(result.error || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating trends:', error);
      alert('Failed to update trends');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (parsedTopics: TrendingTopic[]): Promise<void> => {
    try {
      const now = new Date().toISOString();

      // Get all existing topics from the main table
      const { data: existingTopics } = await supabase
        .from('trending_topics')
        .select('*');

      const existingMap = new Map(
        (existingTopics || []).map(t => [t.name.trim().toLowerCase(), t])
      );

      // Track CSV duplicates
      const seenInCSV = new Map<string, number[]>();
      let duplicatesSkipped = 0;

      const historySnapshots = [];
      let updateCount = 0;
      let insertCount = 0;
      let insertErrors = 0;

      // Process each topic from CSV
      for (let index = 0; index < parsedTopics.length; index++) {
        const topic = parsedTopics[index];
        const normalizedName = topic.name.trim().toLowerCase();

        // Skip CSV duplicates
        if (seenInCSV.has(normalizedName)) {
          duplicatesSkipped++;
          seenInCSV.get(normalizedName)!.push(index + 1);
          continue;
        }
        seenInCSV.set(normalizedName, [index + 1]);

        const existing = existingMap.get(normalizedName);
        const sourceValue = sourceFilter === 'all' ? 'user_upload' : sourceFilter;

        if (existing) {
          // UPDATE existing topic in trending_topics
          const earliestPubDate = !topic.pubDate ? existing.pub_date :
            !existing.pub_date ? topic.pubDate :
            new Date(topic.pubDate) < new Date(existing.pub_date) ? topic.pubDate : existing.pub_date;

          const { error } = await supabase
            .from('trending_topics')
            .update({
              search_volume: topic.searchVolume,
              search_volume_raw: topic.searchVolumeRaw,
              rank: index + 1,
              url: topic.url || existing.url,
              pub_date: earliestPubDate,
              category: topic.category || existing.category,
              source: sourceValue,
              note: topic.note || existing.note,
              value: topic.value !== undefined ? topic.value : existing.value,
              updated_at: now
            })
            .eq('id', existing.id);

          if (error) {
            console.error(`Error updating topic ${topic.name}:`, error);
            insertErrors++;
          } else {
            updateCount++;

            // Add to history
            historySnapshots.push({
              topic_id: existing.id,
              name: topic.name,
              search_volume: topic.searchVolume,
              search_volume_raw: topic.searchVolumeRaw,
              rank: index + 1,
              url: topic.url || existing.url,
              snapshot_at: now
            });
          }
        } else {
          // INSERT new topic into trending_topics
          const { data, error } = await supabase
            .from('trending_topics')
            .insert({
              name: topic.name,
              search_volume: topic.searchVolume,
              search_volume_raw: topic.searchVolumeRaw,
              rank: index + 1,
              url: topic.url,
              pub_date: topic.pubDate,
              category: topic.category,
              source: sourceValue,
              note: topic.note,
              value: topic.value
            })
            .select('id, name, search_volume, search_volume_raw, rank, url')
            .maybeSingle();

          if (error) {
            console.error(`Error inserting topic ${topic.name}:`, error);
            insertErrors++;
          } else if (data) {
            insertCount++;

            // Add to history
            historySnapshots.push({
              topic_id: data.id,
              name: data.name,
              search_volume: data.search_volume,
              search_volume_raw: data.search_volume_raw,
              rank: data.rank,
              url: data.url,
              snapshot_at: now
            });
          }
        }
      }

      // Save all snapshots to history table in batches
      if (historySnapshots.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < historySnapshots.length; i += batchSize) {
          const batch = historySnapshots.slice(i, i + batchSize);
          const { error } = await supabase
            .from('trending_topics_history')
            .insert(batch);

          if (error) {
            console.error(`Error inserting history batch ${i / batchSize + 1}:`, error);
          }
        }
      }

      await loadTopics();

      const duplicatesReport = Array.from(seenInCSV.entries())
        .filter(([_, rows]) => rows.length > 1)
        .map(([name, rows]) => `"${parsedTopics[rows[0] - 1].name}" appears on rows: ${rows.join(', ')}`)
        .join('\n');

      console.log('=== DUPLICATE ANALYSIS ===');
      console.log(`Total rows in CSV: ${parsedTopics.length}`);
      console.log(`Unique topics: ${seenInCSV.size}`);
      console.log(`Duplicate instances: ${duplicatesSkipped}`);
      if (duplicatesReport) {
        console.log('\nDuplicate topics and their row numbers:');
        console.log(duplicatesReport);
      }

      if (parsedTopics.length >= 222) {
        const row222 = parsedTopics[221];
        const row222Name = row222.name.trim().toLowerCase();
        const row222Rows = seenInCSV.get(row222Name) || [];
        console.log('\n=== ROW 222 ANALYSIS ===');
        console.log(`Row 222 topic: "${row222.name}"`);
        console.log(`Volume: ${row222.searchVolumeRaw}`);
        console.log(`All occurrences on rows: ${row222Rows.join(', ')}`);
        if (row222Rows.length > 1) {
          console.log('\nAll instances:');
          row222Rows.forEach(rowNum => {
            const t = parsedTopics[rowNum - 1];
            console.log(`  Row ${rowNum}: "${t.name}" - Volume: ${t.searchVolumeRaw}`);
          });
        }
      }

      const message = `Upload complete!\nTotal in CSV: ${parsedTopics.length}\nDuplicates in CSV: ${duplicatesSkipped}\nUpdated: ${updateCount}\nInserted: ${insertCount}\nFailed: ${insertErrors}\n\nCheck console for duplicate analysis.`;
      setUploadMessage(message);
    } catch (error) {
      console.error('Error saving topics:', error);
      setUploadMessage(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;

    const trimmedCategory = newCategory.trim();

    try {
      const { error } = await supabase
        .from('custom_categories')
        .insert({ name: trimmedCategory });

      if (error && error.code !== '23505') {
        throw error;
      }

      await loadCategories();
    } catch (error) {
      console.error('Error adding category:', error);
    }

    setNewCategory('');
    setShowAddCategory(false);
  };

  const handleAddSource = async () => {
    if (!newSourceValue.trim() || !newSourceLabel.trim()) return;

    const trimmedValue = newSourceValue.trim().toLowerCase().replace(/\s+/g, '_');
    const trimmedLabel = newSourceLabel.trim();

    try {
      const { error } = await supabase
        .from('custom_sources')
        .insert({ value: trimmedValue, label: trimmedLabel });

      if (error && error.code !== '23505') {
        throw error;
      }

      await loadSources();
      setSourceFilter(trimmedValue);
    } catch (error) {
      console.error('Error adding source:', error);
    }

    setNewSourceValue('');
    setNewSourceLabel('');
    setShowAddSource(false);
  };

  const handleCreatePage = async () => {
    if (!newPageUrl.trim() || !newPageMetaTitle.trim() || !newPageMetaDescription.trim()) {
      alert('Please fill in all fields');
      return;
    }

    let pageUrl = newPageUrl.trim();
    if (!pageUrl.startsWith('/')) {
      pageUrl = '/' + pageUrl;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('You must be logged in to create a page');
        return;
      }

      const { error } = await supabase
        .from('pages')
        .insert({
          page_url: pageUrl,
          source: newPageSource,
          template: newPageTemplate,
          meta_title: newPageMetaTitle,
          meta_description: newPageMetaDescription,
          summary: newPageSummary.trim() || null,
          user_id: user.id
        });

      if (error) {
        if (error.code === '23505') {
          alert('A page with this URL already exists');
        } else {
          throw error;
        }
        return;
      }

      setNewPageUrl('');
      setNewPageSource('all');
      setNewPageTemplate('dynamic_page');
      setNewPageMetaTitle('');
      setNewPageMetaDescription('');
      setNewPageSummary('');
      setShowCreatePage(false);
      await loadLatestPages();
      alert(`Page created successfully! Visit ${pageUrl}`);
    } catch (error) {
      console.error('Error creating page:', error);
      alert('Failed to create page');
    }
  };

  const loadAllPages = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAllPages(data || []);
      setShowAllPages(true);
    } catch (error) {
      console.error('Error loading pages:', error);
      alert('Failed to load pages');
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;

      await loadAllPages();
      await loadLatestPages();
    } catch (error) {
      console.error('Error deleting page:', error);
      alert('Failed to delete page');
    }
  };

  const handleEditPage = (page: any) => {
    setEditingPage(page);
    setEditPageUrl(page.page_url);
    setEditPageSource(page.source);
    setEditPageTemplate(page.template || 'dynamic_page');
    setEditPageMetaTitle(page.meta_title);
    setEditPageMetaDescription(page.meta_description);
    setEditPageSummary(page.summary || '');
  };

  const handleCancelEdit = () => {
    setEditingPage(null);
    setEditPageUrl('');
    setEditPageSource('all');
    setEditPageTemplate('dynamic_page');
    setEditPageMetaTitle('');
    setEditPageMetaDescription('');
    setEditPageSummary('');
  };

  const handleUpdatePage = async () => {
    if (!editingPage || !editPageUrl.trim() || !editPageMetaTitle.trim() || !editPageMetaDescription.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    let pageUrl = editPageUrl.trim();
    if (!pageUrl.startsWith('/')) {
      pageUrl = '/' + pageUrl;
    }

    try {
      const { error } = await supabase
        .from('pages')
        .update({
          page_url: pageUrl,
          source: editPageSource,
          template: editPageTemplate,
          meta_title: editPageMetaTitle,
          meta_description: editPageMetaDescription,
          summary: editPageSummary.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPage.id);

      if (error) {
        if (error.code === '23505') {
          alert('A page with this URL already exists');
        } else {
          throw error;
        }
        return;
      }

      handleCancelEdit();
      await loadAllPages();
      await loadLatestPages();
      alert('Page updated successfully!');
    } catch (error) {
      console.error('Error updating page:', error);
      alert('Failed to update page');
    }
  };

  const loadLatestPages = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setLatestPages(data || []);
    } catch (error) {
      console.error('Error loading latest pages:', error);
    }
  };

  const getFilteredTopics = () => {
    if (!searchQuery.trim()) return topics;

    const query = searchQuery.toLowerCase().trim();
    const filtered = topics.filter(topic =>
      topic.name.toLowerCase().includes(query)
    );
    return filtered;
  };

  const getSortedTopics = () => {
    const filtered = getFilteredTopics();
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'category':
          aValue = (a.category || '').toLowerCase();
          bValue = (b.category || '').toLowerCase();
          break;
        case 'searchVolume':
          aValue = a.searchVolume;
          bValue = b.searchVolume;
          break;
        case 'rank':
          aValue = topics.indexOf(a);
          bValue = topics.indexOf(b);
          break;
        case 'pubDate':
          aValue = a.pubDate ? new Date(a.pubDate).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          bValue = b.pubDate ? new Date(b.pubDate).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          break;
        case 'createdAt':
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="opacity-50" />;
    }
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  if (!isAdmin && showLogin) {
    return <Login onLogin={loadTopics} theme={theme} />;
  }

  const topTopics = [...topics].sort((a, b) => b.searchVolume - a.searchVolume).slice(0, 10);
  const topTopicNames = topTopics.map(t => t.name).join(', ');
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <>
      <Helmet>
        <title>Google Trending Topics Today - Real-Time Search Trends & Analytics</title>
        <meta name="description" content={`Discover today's trending topics on Google: ${topTopicNames || 'live search trends, viral topics, and popular searches'}. Updated in real-time with interactive visualizations. ${currentDate}`} />
        <meta property="og:title" content="Google Trending Topics Today - Real-Time Search Trends" />
        <meta property="og:description" content={`Live trending topics: ${topTopicNames || 'Track what\'s popular on Google right now'}. Interactive bubble chart visualization updated hourly.`} />
        <link rel="canonical" href={`${import.meta.env.VITE_BASE_URL}/`} />
      </Helmet>

      <ToolSchema
        name="Top Best Charts - Trending Topics & Data Visualization"
        description="Free interactive tool for visualizing real-time trending topics from Google Trends and search data. Create bubble charts, bar charts, treemaps, and donut charts to explore rankings and insights."
        url={`${import.meta.env.VITE_BASE_URL || 'https://topbestcharts.com'}/`}
        applicationCategory="AnalysisApplication"
        screenshot={[
          `${import.meta.env.VITE_BASE_URL || 'https://topbestcharts.com'}/screenshots/bubble-chart.jpg`,
          `${import.meta.env.VITE_BASE_URL || 'https://topbestcharts.com'}/screenshots/bar-chart.jpg`,
          `${import.meta.env.VITE_BASE_URL || 'https://topbestcharts.com'}/screenshots/treemap.jpg`
        ]}
      />

      {isAdmin && (
        <header className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b py-4 md:py-6 px-3 md:px-6 shadow-sm border-t-0`}>
          <div className="max-w-7xl mx-auto">
            <div className={`text-center mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-xs font-semibold uppercase tracking-wide`}>
              Admin Menu
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-4">
              <div className="flex-1 w-full">
                <nav className="flex justify-center gap-4">
                <Link
                  to="/"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/'
                      ? theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-600 text-white shadow-sm'
                      : theme === 'dark'
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Home size={16} />
                  Table View
                </Link>
                <Link
                  to="/admin/pages"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/admin/pages'
                      ? theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-600 text-white shadow-sm'
                      : theme === 'dark'
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <FileText size={16} />
                  Pages
                </Link>
              </nav>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3 items-center">
              <button
                onClick={logout}
                className={`px-3 md:px-4 py-1.5 md:py-2 ${theme === 'dark' ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} rounded-lg transition-colors text-xs md:text-sm font-medium text-white flex items-center gap-2`}
              >
                <LogOut size={16} />
                Logout
              </button>
              <button
                onClick={manualUpdate}
                disabled={loading}
                className={`px-3 md:px-4 py-1.5 md:py-2 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow disabled:bg-gray-300'} disabled:cursor-not-allowed rounded-lg transition-colors text-xs md:text-sm font-medium text-white`}
              >
                {loading ? 'Updating...' : 'Update Now'}
              </button>
              <button
                onClick={saveBackup}
                className={`px-3 md:px-4 py-1.5 md:py-2 ${theme === 'dark' ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} rounded-lg transition-colors text-xs md:text-sm font-medium text-white`}
              >
                Save
              </button>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                <div className="relative h-3 w-3">
                  <svg className="h-3 w-3 -rotate-90" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      opacity="0.2"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray={`${2 * Math.PI * 10}`}
                      strokeDashoffset={`${2 * Math.PI * 10 * (1 - updateProgress / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <span className="text-xs font-mono">{nextUpdateIn}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
              <button
                onClick={() => setShowAddSource(true)}
                className={`px-3 py-1 ${theme === 'dark' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-teal-600 hover:bg-teal-700 shadow-sm hover:shadow'} rounded transition-colors text-xs font-medium text-white`}
              >
                Add Source
              </button>
              <div className="flex items-center gap-2">
                <label htmlFor="adminSourceFilter" className={`text-xs font-medium whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Source:
                </label>
                <select
                  id="adminSourceFilter"
                  value={sourceFilter}
                  onChange={(e) => {
                    if (e.target.value === 'add_new') {
                      setShowAddSource(true);
                    } else {
                      setSourceFilter(e.target.value);
                    }
                  }}
                  className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  aria-label="Filter trending topics by data source"
                >
                  {sources.map(source => (
                    <option key={source.value} value={source.value}>{source.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowAddCategory(true)}
                className={`px-3 py-1 ${theme === 'dark' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-teal-600 hover:bg-teal-700 shadow-sm hover:shadow'} rounded transition-colors text-xs font-medium text-white`}
              >
                Add Category
              </button>
              <FileUpload
                onUpload={handleFileUpload}
                theme={theme}
                sourceFilter={sourceFilter}
                sources={sources.map(s => s.value)}
                onSourceFilterChange={(source) => {
                  if (source === 'add_new') {
                    setShowAddSource(true);
                  } else {
                    setSourceFilter(source);
                  }
                }}
              />
            </div>
            <div className={`${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} border-t pt-3 flex gap-2`}>
              <button
                onClick={() => setShowCreatePage(true)}
                className={`px-3 py-1 ${theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow'} rounded transition-colors text-xs font-medium text-white`}
              >
                Create New Page
              </button>
              <button
                onClick={loadAllPages}
                className={`px-3 py-1 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow'} rounded transition-colors text-xs font-medium text-white`}
              >
                View All Pages
              </button>
            </div>
          </div>
        </div>
      </header>
      )}

      <Header
        theme={theme}
        isAdmin={isAdmin}
        onLoginClick={() => setShowLogin(true)}
        onLogout={logout}
        useH1={false}
      />

      <FilterMenu
        theme={theme}
        loading={loading}
        viewMode={viewMode}
        dateFilter={dateFilter}
        categoryFilter={categoryFilter}
        categories={categories}
        maxBubbles={maxBubbles}
        searchQuery={searchQuery}
        nextBubbleIn={nextBubbleIn}
        bubbleProgress={bubbleProgress}
        bubbleLayout={bubbleLayout}
        shape={shape}
        onViewModeChange={setViewMode}
        onDateFilterChange={setDateFilter}
        onCategoryFilterChange={setCategoryFilter}
        onMaxBubblesChange={setMaxBubbles}
        onThemeChange={handleThemeChange}
        onSearchQueryChange={setSearchQuery}
        onSearchClear={() => {
          setSearchQuery('');
          setViewMode('bubble');
        }}
        onRefresh={loadTopics}
        onBubbleLayoutChange={setBubbleLayout}
        onShapeChange={setShape}
        variant="homepage"
      />


      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'text-gray-900'} px-2 md:px-6 py-2 md:py-6 pb-0`} style={theme === 'light' ? { backgroundColor: '#f1f3f4' } : {}}>
        {uploadMessage && (
          <div className="fixed top-4 right-4 z-50 max-w-md">
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-xl p-4`}>
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-line`}>
                    {uploadMessage}
                  </div>
                </div>
                <button
                  onClick={() => setUploadMessage(null)}
                  className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} text-xl leading-none flex-shrink-0`}
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full`}>
              <div className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'} border-b px-6 py-4 flex justify-between items-center`}>
                <h2 className="text-xl font-bold">Add New Category</h2>
                <button
                  onClick={() => {
                    setShowAddCategory(false);
                    setNewCategory('');
                  }}
                  className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} text-2xl leading-none`}
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="newCategory" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Category Name
                    </label>
                    <input
                      id="newCategory"
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                      placeholder="e.g., Technology, Sports, Entertainment"
                      className={`w-full ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowAddCategory(false);
                        setNewCategory('');
                      }}
                      className={`px-4 py-2 ${theme === 'dark' ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300 border border-gray-300'} rounded-lg transition-colors text-sm font-medium`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddCategory}
                      disabled={!newCategory.trim()}
                      className={`px-4 py-2 ${theme === 'dark' ? 'bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600' : 'bg-teal-600 hover:bg-teal-700 shadow-sm hover:shadow disabled:bg-gray-300'} disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium text-white`}
                    >
                      Add Category
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAddSource && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full`}>
              <div className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'} border-b px-6 py-4 flex justify-between items-center`}>
                <h2 className="text-xl font-bold">Add New Source</h2>
                <button
                  onClick={() => {
                    setShowAddSource(false);
                    setNewSourceValue('');
                    setNewSourceLabel('');
                  }}
                  className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} text-2xl leading-none`}
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="newSourceLabel" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Display Name
                    </label>
                    <input
                      id="newSourceLabel"
                      type="text"
                      value={newSourceLabel}
                      onChange={(e) => setNewSourceLabel(e.target.value)}
                      placeholder="e.g., Twitter Trends"
                      className={`w-full ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label htmlFor="newSourceValue" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Internal Value (lowercase, no spaces)
                    </label>
                    <input
                      id="newSourceValue"
                      type="text"
                      value={newSourceValue}
                      onChange={(e) => setNewSourceValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
                      placeholder="e.g., twitter_trends"
                      className={`w-full ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowAddSource(false);
                        setNewSourceValue('');
                        setNewSourceLabel('');
                      }}
                      className={`px-4 py-2 ${theme === 'dark' ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300 border border-gray-300'} rounded-lg transition-colors text-sm font-medium`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddSource}
                      disabled={!newSourceValue.trim() || !newSourceLabel.trim()}
                      className={`px-4 py-2 ${theme === 'dark' ? 'bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600' : 'bg-teal-600 hover:bg-teal-700 shadow-sm hover:shadow disabled:bg-gray-300'} disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium text-white`}
                    >
                      Add Source
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAllPages && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col`}>
              <div className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'} border-b px-6 py-4 flex justify-between items-center`}>
                <h2 className="text-xl font-bold">All Pages</h2>
                <button
                  onClick={() => {
                    setShowAllPages(false);
                    handleCancelEdit();
                  }}
                  className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} text-2xl leading-none`}
                >
                  ×
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                {allPages.length === 0 ? (
                  <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    No pages created yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allPages.map((page) => (
                      <div
                        key={page.id}
                        className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}
                      >
                        {editingPage?.id === page.id ? (
                          <div className="space-y-3">
                            <div>
                              <label htmlFor={`edit-url-${page.id}`} className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                Page URL *
                              </label>
                              <input
                                id={`edit-url-${page.id}`}
                                type="text"
                                value={editPageUrl}
                                onChange={(e) => setEditPageUrl(e.target.value)}
                                className={`w-full ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                              />
                            </div>
                            <div>
                              <label htmlFor={`edit-source-${page.id}`} className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                Source *
                              </label>
                              <select
                                id={`edit-source-${page.id}`}
                                value={editPageSource}
                                onChange={(e) => setEditPageSource(e.target.value)}
                                className={`w-full ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                              >
                                {sources.map(source => (
                                  <option key={source.value} value={source.value}>{source.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`edit-template-${page.id}`} className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                Template *
                              </label>
                              <select
                                id={`edit-template-${page.id}`}
                                value={editPageTemplate}
                                onChange={(e) => setEditPageTemplate(e.target.value)}
                                className={`w-full ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                              >
                                {templateOptions.map(template => (
                                  <option key={template.value} value={template.value}>{template.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`edit-title-${page.id}`} className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                Meta Title *
                              </label>
                              <input
                                id={`edit-title-${page.id}`}
                                type="text"
                                value={editPageMetaTitle}
                                onChange={(e) => setEditPageMetaTitle(e.target.value)}
                                className={`w-full ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                              />
                            </div>
                            <div>
                              <label htmlFor={`edit-desc-${page.id}`} className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                Meta Description *
                              </label>
                              <textarea
                                id={`edit-desc-${page.id}`}
                                value={editPageMetaDescription}
                                onChange={(e) => setEditPageMetaDescription(e.target.value)}
                                rows={3}
                                className={`w-full ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
                              />
                            </div>
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                Summary (Rich HTML)
                              </label>
                              <div
                                ref={editSummaryRef}
                                contentEditable
                                onPaste={(e) => handlePaste(e, setEditPageSummary, editSummaryRef)}
                                onInput={(e) => setEditPageSummary(e.currentTarget.innerHTML)}
                                dangerouslySetInnerHTML={{ __html: editPageSummary }}
                                className={`w-full min-h-[150px] max-h-[300px] overflow-y-auto ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'} border-2 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                style={{
                                  wordWrap: 'break-word',
                                  overflowWrap: 'break-word'
                                }}
                              />
                              <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                Paste rich content - all formatting preserved
                              </p>
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={handleCancelEdit}
                                className={`px-3 py-1.5 ${theme === 'dark' ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-300 hover:bg-gray-400'} rounded transition-colors text-xs font-medium`}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleUpdatePage}
                                disabled={!editPageUrl.trim() || !editPageMetaTitle.trim() || !editPageMetaDescription.trim()}
                                className={`px-3 py-1.5 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300'} disabled:cursor-not-allowed rounded transition-colors text-xs font-medium text-white`}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg mb-1">{page.meta_title}</h3>
                              <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {page.meta_description}
                              </p>
                              {page.summary && (
                                <div className={`text-xs mb-2 p-2 rounded ${theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                  <div className={`font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>Summary:</div>
                                  <div
                                    className="line-clamp-3"
                                    dangerouslySetInnerHTML={{ __html: page.summary }}
                                  />
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-3 text-xs">
                                <a
                                  href={page.page_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`font-mono ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} hover:underline`}
                                >
                                  {page.page_url}
                                </a>
                                <span className={`px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                                  Template: {templateOptions.find(t => t.value === page.template)?.label || page.template || 'Dynamic Page'}
                                </span>
                                <span className={`px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                                  Source: {sources.find(s => s.value === page.source)?.label || page.source}
                                </span>
                                <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                  Created: {new Date(page.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleEditPage(page)}
                                className={`px-3 py-1.5 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} rounded transition-colors text-xs font-medium text-white`}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeletePage(page.id)}
                                className={`px-3 py-1.5 ${theme === 'dark' ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} rounded transition-colors text-xs font-medium text-white`}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showCreatePage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto`}>
              <div className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'} border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10`}>
                <h2 className="text-xl font-bold">Create New Page</h2>
                <button
                  onClick={() => {
                    setShowCreatePage(false);
                    setNewPageUrl('');
                    setNewPageSource('all');
                    setNewPageTemplate('dynamic_page');
                    setNewPageMetaTitle('');
                    setNewPageMetaDescription('');
                    setNewPageSummary('');
                  }}
                  className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} text-2xl leading-none`}
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="newPageUrl" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Page URL *
                    </label>
                    <input
                      id="newPageUrl"
                      type="text"
                      value={newPageUrl}
                      onChange={(e) => setNewPageUrl(e.target.value)}
                      placeholder="e.g., /sports-trends or sports-trends"
                      className={`w-full ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label htmlFor="newPageSource" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Source Filter *
                    </label>
                    <select
                      id="newPageSource"
                      value={newPageSource}
                      onChange={(e) => setNewPageSource(e.target.value)}
                      className={`w-full ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      {sources.map(source => (
                        <option key={source.value} value={source.value}>{source.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="newPageTemplate" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Template *
                    </label>
                    <select
                      id="newPageTemplate"
                      value={newPageTemplate}
                      onChange={(e) => setNewPageTemplate(e.target.value)}
                      className={`w-full ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      {templateOptions.map(template => (
                        <option key={template.value} value={template.value}>{template.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="newPageMetaTitle" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Meta Title *
                    </label>
                    <input
                      id="newPageMetaTitle"
                      type="text"
                      value={newPageMetaTitle}
                      onChange={(e) => setNewPageMetaTitle(e.target.value)}
                      placeholder="e.g., Sports Trending Topics Today"
                      className={`w-full ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                  <div>
                    <label htmlFor="newPageMetaDescription" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Meta Description *
                    </label>
                    <textarea
                      id="newPageMetaDescription"
                      value={newPageMetaDescription}
                      onChange={(e) => setNewPageMetaDescription(e.target.value)}
                      placeholder="e.g., Discover the latest sports trending topics..."
                      rows={4}
                      className={`w-full ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Summary (Rich HTML Editor)
                    </label>
                    <div
                      ref={newSummaryRef}
                      contentEditable
                      onPaste={(e) => handlePaste(e, setNewPageSummary, newSummaryRef)}
                      onInput={(e) => setNewPageSummary(e.currentTarget.innerHTML)}
                      dangerouslySetInnerHTML={{ __html: newPageSummary }}
                      className={`w-full min-h-[200px] max-h-[400px] overflow-y-auto ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      style={{
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word'
                      }}
                    />
                    <div className={`mt-2 flex flex-wrap gap-2 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      <span className="font-medium">Tips:</span>
                      <span>• Paste content with full formatting preserved</span>
                      <span>• Tables, images, and complex layouts supported</span>
                      <span>• All HTML formatting maintained</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowCreatePage(false);
                        setNewPageUrl('');
                        setNewPageSource('all');
                        setNewPageTemplate('dynamic_page');
                        setNewPageMetaTitle('');
                        setNewPageMetaDescription('');
                        setNewPageSummary('');
                      }}
                      className={`px-4 py-2 ${theme === 'dark' ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300 border border-gray-300'} rounded-lg transition-colors text-sm font-medium`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreatePage}
                      disabled={!newPageUrl.trim() || !newPageMetaTitle.trim() || !newPageMetaDescription.trim()}
                      className={`px-4 py-2 ${theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600' : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow disabled:bg-gray-300'} disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium text-white`}
                    >
                      Create Page
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <main role="main" aria-label="Trending topics visualization">
        {loading && (
          <div className="max-w-7xl mx-auto mb-8 animate-pulse">
            {/* Header Skeleton */}
            <div className="mb-4">
              <div className={`h-8 md:h-10 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-3/4 mb-4`}></div>
              <div className="flex gap-3 mb-4">
                <div className={`h-6 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-48`}></div>
                <div className={`h-6 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-32`}></div>
              </div>
            </div>

            {/* Chart Skeleton */}
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg mb-8`} style={{ height: '600px', minHeight: '600px' }}>
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className={`inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid ${theme === 'dark' ? 'border-gray-600 border-t-blue-500' : 'border-gray-300 border-t-blue-600'}`}></div>
                  <p className={`mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading trending topics...</p>
                </div>
              </div>
            </div>

            {/* Featured Section Skeleton */}
            <div className={`w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-t border-b py-6 mb-8`}>
              <div className="max-w-7xl mx-auto px-4">
                <div className={`h-6 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-32 mb-4`}></div>
                <div className="flex flex-wrap gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-5 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-48`}></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top 10 List Skeleton */}
            <div className="max-w-7xl mx-auto">
              <div className={`h-8 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-64 mb-4`}></div>
              <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-md border border-gray-200'} rounded-lg overflow-hidden`}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <div key={i} className={`px-6 py-4 flex items-center gap-4 ${i < 10 ? (theme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}>
                    <div className={`w-12 h-6 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded`}></div>
                    <div className="flex-1">
                      <div className={`h-5 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-3/4 mb-2`}></div>
                      <div className={`h-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-1/2`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {!loading && (
          <>
            {topics.length > 0 && (
              <article className="max-w-7xl mx-auto mb-8">
                <header>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h1 className={`text-xl md:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Real-Time Trending Topics, People, News & Politics Bubble Charts
                    </h1>
                    {viewMode === 'bubble' && topics.length > 0 && (
                      <ShareSnapshot theme={theme} canvasRef={bubbleChartRef} variant="inline" />
                    )}
                    {viewMode === 'treemap' && topics.length > 0 && (
                      <ShareSnapshot theme={theme} canvasRef={treemapChartRef} variant="inline" />
                    )}
                    {viewMode === 'donut' && topics.length > 0 && (
                      <ShareSnapshot theme={theme} canvasRef={donutChartRef} variant="inline" />
                    )}
                  </div>
                  <div className={`flex flex-wrap items-center gap-3 mb-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <time dateTime={lastUpdated.toISOString()}>
                      Last updated: {lastUpdated.toLocaleString('en-US', {
                        timeZone: 'America/New_York',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })} ET
                    </time>
                    <button
                      onClick={() => {
                        const element = document.getElementById('top-trending-heading');
                        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={`px-2 py-1 rounded text-xs cursor-pointer transition-all hover:scale-105 ${theme === 'dark' ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                    >
                      {topics.length} trending topics
                    </button>
                    <a
                      href="/insights"
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:scale-105 ${theme === 'dark' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'}`}
                    >
                      View Brand Insights
                    </a>
                  </div>
                </header>
              </article>
            )}
            {!connectionError && topics.length === 0 && (
              <div className="max-w-4xl mx-auto mt-12">
                <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg p-8 text-center`}>
                  <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    No Topics Found
                  </h2>
                  <p className={`mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {(dateFilter !== 'all' || categoryFilter !== 'all' || sourceFilter !== 'all')
                      ? 'No topics match your current filters. Try adjusting your filter settings.'
                      : 'The database is currently empty. Topics will appear here once data is added.'}
                  </p>
                  {(dateFilter !== 'all' || categoryFilter !== 'all' || sourceFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setDateFilter('all');
                        setCategoryFilter('all');
                        setSourceFilter('all');
                      }}
                      className={`px-6 py-2 rounded-lg font-semibold transition-colors ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow text-white'}`}
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              </div>
            )}
            {connectionError && (
              <div className="max-w-4xl mx-auto mt-12">
                <div className={`${theme === 'dark' ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border rounded-lg p-8 text-center`}>
                  <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-700'}`}>
                    Database Connection Error
                  </h2>
                  <p className={`mb-6 ${theme === 'dark' ? 'text-red-300' : 'text-red-600'}`}>
                    Unable to connect to the database. This usually happens when the site is deployed without proper environment variables.
                  </p>
                  <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} border rounded-lg p-6 text-left`}>
                    <h3 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>To fix this issue:</h3>
                    <ol className={`list-decimal list-inside space-y-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      <li>Go to your repository Settings → Secrets and variables → Actions</li>
                      <li>Add the following secrets:
                        <ul className="list-disc list-inside ml-6 mt-2">
                          <li><code className={`px-2 py-1 rounded text-sm ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>VITE_SUPABASE_URL</code></li>
                          <li><code className={`px-2 py-1 rounded text-sm ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>VITE_SUPABASE_ANON_KEY</code></li>
                        </ul>
                      </li>
                      <li>Go to the Actions tab and manually trigger a new deployment</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
            {topics.length > 0 && viewMode === 'bubble' && (
              <>
                <div ref={bubbleChartRef}>
                  <BubbleChart topics={topics} maxDisplay={maxBubbles} theme={theme} layout={bubbleLayout} onBubbleTimingUpdate={handleBubbleTimingUpdate} comparingTopics={comparingTopics} onComparingTopicsChange={setComparingTopics} shape={shape as Shape} />
                </div>

                {/* Featured Pages Section - Full Width */}
                <div className={`w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-t border-b py-6 mt-8`}>
                  <div className="max-w-7xl mx-auto px-4">
                    <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Featured
                    </h2>
                    {latestPages.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {latestPages.map((page) => (
                          <a
                            key={page.id}
                            href={page.page_url}
                            className={`text-sm ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors hover:underline`}
                          >
                            {page.meta_title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <section className="max-w-7xl mx-auto mt-8 mb-0 md:mb-8" aria-labelledby="top-trending-heading">
                  <h2 id="top-trending-heading" className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {showFullTop10 ? 'All Trending Topics' : 'Top 10 Trending Topics Today'}
                  </h2>
                  <p className={`mb-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {showFullTop10 ? 'Complete list of all trending topics ranked by search volume' : 'Discover the most popular trending topics ranked by search volume'}
                  </p>
                  <ol className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-md border border-gray-200'} rounded-lg overflow-hidden list-none`} itemScope itemType="https://schema.org/ItemList">
                    {[...topics]
                      .sort((a, b) => b.searchVolume - a.searchVolume)
                      .slice(0, showFullTop10 ? undefined : 10)
                      .map((topic, index) => (
                        <li
                          key={index}
                          className={`px-6 py-4 flex items-center gap-4 cursor-pointer ${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors ${index < (showFullTop10 ? topics.length - 1 : 9) ? (theme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}
                          itemProp="itemListElement"
                          itemScope
                          itemType="https://schema.org/ListItem"
                          onClick={() => {
                            if (topic.url) {
                              window.open(topic.url, '_blank', 'noopener,noreferrer');
                            }
                          }}
                        >
                          <meta itemProp="position" content={String(index + 1)} />
                          <div className={`w-12 flex items-center justify-center`} aria-label={`Rank ${index + 1}`}>
                            <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              {index + 1}
                            </div>
                          </div>
                          <article className="flex-1" itemProp="item" itemScope itemType="https://schema.org/Thing">
                            <h3 className="font-semibold text-lg mb-1" itemProp="name">{topic.name.replace(/"/g, '')}</h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} itemProp="description">
                                {topic.searchVolumeRaw.replace(/"/g, '')}
                              </span>
                              {topic.category && (
                                <span className={`px-2 py-0.5 rounded text-xs ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                  {topic.category}
                                </span>
                              )}
                              {topic.pubDate && (
                                <time className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} dateTime={new Date(topic.pubDate).toISOString()}>
                                  {new Date(topic.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </time>
                              )}
                            </div>
                            {topic.note && (
                              <div className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {topic.note}
                              </div>
                            )}
                          </article>
                        </li>
                      ))}
                  </ol>
                  {topics.length > 10 && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setShowFullTop10(!showFullTop10)}
                        className={`px-6 py-2 rounded-lg font-semibold transition-colors ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow text-white'}`}
                      >
                        {showFullTop10 ? 'Show Top 10 Only' : 'See Full List'}
                      </button>
                    </div>
                  )}
                </section>
              </>
            )}
            {topics.length > 0 && viewMode === 'bar' && (
              <>
                <div className="max-w-7xl mx-auto">
                  <BarChart topics={topics} maxDisplay={maxBubbles} theme={theme} />
                </div>

                {/* Featured Pages Section - Full Width */}
                <div className={`w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-t border-b py-6 mt-8`}>
                  <div className="max-w-7xl mx-auto px-4">
                    <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Featured
                    </h2>
                    {latestPages.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {latestPages.map((page) => (
                          <a
                            key={page.id}
                            href={page.page_url}
                            className={`text-sm ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors hover:underline`}
                          >
                            {page.meta_title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <section className="max-w-7xl mx-auto mt-8 mb-0 md:mb-8" aria-labelledby="top-trending-heading">
                  <h2 id="top-trending-heading" className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {showFullTop10 ? 'All Trending Topics' : 'Top 10 Trending Topics Today'}
                  </h2>
                  <p className={`mb-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {showFullTop10 ? 'Complete list of all trending topics ranked by search volume' : 'Discover the most popular trending topics ranked by search volume'}
                  </p>
                  <ol className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-md border border-gray-200'} rounded-lg overflow-hidden list-none`} itemScope itemType="https://schema.org/ItemList">
                    {[...topics]
                      .sort((a, b) => b.searchVolume - a.searchVolume)
                      .slice(0, showFullTop10 ? undefined : 10)
                      .map((topic, index) => (
                        <li
                          key={index}
                          className={`px-6 py-4 flex items-center gap-4 cursor-pointer ${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors ${index < (showFullTop10 ? topics.length - 1 : 9) ? (theme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}
                          itemProp="itemListElement"
                          itemScope
                          itemType="https://schema.org/ListItem"
                          onClick={() => {
                            if (topic.url) {
                              window.open(topic.url, '_blank', 'noopener,noreferrer');
                            }
                          }}
                        >
                          <meta itemProp="position" content={String(index + 1)} />
                          <div className={`w-12 flex items-center justify-center`} aria-label={`Rank ${index + 1}`}>
                            <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              {index + 1}
                            </div>
                          </div>
                          <article className="flex-1" itemProp="item" itemScope itemType="https://schema.org/Thing">
                            <h3 className="font-semibold text-lg mb-1" itemProp="name">{topic.name.replace(/"/g, '')}</h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} itemProp="description">
                                {topic.searchVolumeRaw.replace(/"/g, '')}
                              </span>
                              {topic.category && (
                                <span className={`px-2 py-0.5 rounded text-xs ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                  {topic.category}
                                </span>
                              )}
                              {topic.pubDate && (
                                <time className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} dateTime={new Date(topic.pubDate).toISOString()}>
                                  {new Date(topic.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </time>
                              )}
                            </div>
                            {topic.note && (
                              <div className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {topic.note}
                              </div>
                            )}
                          </article>
                        </li>
                      ))}
                  </ol>
                  {topics.length > 10 && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setShowFullTop10(!showFullTop10)}
                        className={`px-6 py-2 rounded-lg font-semibold transition-colors ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow text-white'}`}
                      >
                        {showFullTop10 ? 'Show Top 10 Only' : 'See Full List'}
                      </button>
                    </div>
                  )}
                </section>
              </>
            )}
            {topics.length > 0 && viewMode === 'treemap' && (
              <>
                <div ref={treemapChartRef} className="max-w-7xl mx-auto" style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}>
                  <Treemap
                    topics={topics}
                    maxDisplay={maxBubbles}
                    theme={theme}
                    useCryptoColors={sourceFilter === 'coingecko_crypto'}
                    cryptoTimeframe="24h"
                  />
                </div>

                {/* Featured Pages Section - Full Width */}
                <div className={`w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-t border-b py-6 mt-8`}>
                  <div className="max-w-7xl mx-auto px-4">
                    <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Featured
                    </h2>
                    {latestPages.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {latestPages.map((page) => (
                          <a
                            key={page.id}
                            href={page.page_url}
                            className={`text-sm ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors hover:underline`}
                          >
                            {page.meta_title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <section className="max-w-7xl mx-auto mt-8 mb-0 md:mb-8" aria-labelledby="top-trending-heading">
                  <h2 id="top-trending-heading" className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {showFullTop10 ? 'All Trending Topics' : 'Top 10 Trending Topics Today'}
                  </h2>
                  <p className={`mb-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {showFullTop10 ? 'Complete list of all trending topics ranked by search volume' : 'Discover the most popular trending topics ranked by search volume'}
                  </p>
                  <ol className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-md border border-gray-200'} rounded-lg overflow-hidden list-none`} itemScope itemType="https://schema.org/ItemList">
                    {[...topics]
                      .sort((a, b) => b.searchVolume - a.searchVolume)
                      .slice(0, showFullTop10 ? undefined : 10)
                      .map((topic, index) => (
                        <li
                          key={index}
                          className={`px-6 py-4 flex items-center gap-4 cursor-pointer ${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors ${index < (showFullTop10 ? topics.length - 1 : 9) ? (theme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}
                          itemProp="itemListElement"
                          itemScope
                          itemType="https://schema.org/ListItem"
                          onClick={() => {
                            if (topic.url) {
                              window.open(topic.url, '_blank', 'noopener,noreferrer');
                            }
                          }}
                        >
                          <meta itemProp="position" content={String(index + 1)} />
                          <div className={`w-12 flex items-center justify-center`} aria-label={`Rank ${index + 1}`}>
                            <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              {index + 1}
                            </div>
                          </div>
                          <article className="flex-1" itemProp="item" itemScope itemType="https://schema.org/Thing">
                            <h3 className="font-semibold text-lg mb-1" itemProp="name">{topic.name.replace(/"/g, '')}</h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} itemProp="description">
                                {topic.searchVolumeRaw.replace(/"/g, '')}
                              </span>
                              {topic.category && (
                                <span className={`px-2 py-0.5 rounded text-xs ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                  {topic.category}
                                </span>
                              )}
                              {topic.pubDate && (
                                <time className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} dateTime={new Date(topic.pubDate).toISOString()}>
                                  {new Date(topic.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </time>
                              )}
                            </div>
                            {topic.note && (
                              <div className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {topic.note}
                              </div>
                            )}
                          </article>
                        </li>
                      ))}
                  </ol>
                  {topics.length > 10 && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setShowFullTop10(!showFullTop10)}
                        className={`px-6 py-2 rounded-lg font-semibold transition-colors ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow text-white'}`}
                      >
                        {showFullTop10 ? 'Show Top 10 Only' : 'See Full List'}
                      </button>
                    </div>
                  )}
                </section>
              </>
            )}
            {topics.length > 0 && viewMode === 'donut' && (
              <>
                <div ref={donutChartRef} className="max-w-7xl mx-auto" style={{ height: 'calc(100vh - 300px)', minHeight: '600px' }}>
                  <DonutChart
                    topics={topics}
                    maxDisplay={maxBubbles}
                    theme={theme}
                    useCryptoColors={sourceFilter === 'coingecko_crypto'}
                    cryptoTimeframe="24h"
                  />
                </div>

                {/* Featured Pages Section - Full Width */}
                <div className={`w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-t border-b py-6 mt-8`}>
                  <div className="max-w-7xl mx-auto px-4">
                    <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Featured
                    </h2>
                    {latestPages.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {latestPages.map((page) => (
                          <a
                            key={page.id}
                            href={page.page_url}
                            className={`text-sm ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors hover:underline`}
                          >
                            {page.meta_title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <section className="max-w-7xl mx-auto mt-8 mb-0 md:mb-8" aria-labelledby="top-trending-heading">
                  <h2 id="top-trending-heading" className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {showFullTop10 ? 'All Trending Topics' : 'Top 10 Trending Topics Today'}
                  </h2>
                  <p className={`mb-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {showFullTop10 ? 'Complete list of all trending topics ranked by search volume' : 'Discover the most popular trending topics ranked by search volume'}
                  </p>
                  <ol className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-md border border-gray-200'} rounded-lg overflow-hidden list-none`} itemScope itemType="https://schema.org/ItemList">
                    {[...topics]
                      .sort((a, b) => b.searchVolume - a.searchVolume)
                      .slice(0, showFullTop10 ? undefined : 10)
                      .map((topic, index) => (
                        <li
                          key={index}
                          className={`px-6 py-4 flex items-center gap-4 ${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors ${index < (showFullTop10 ? topics.length - 1 : 9) ? (theme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}
                          itemProp="itemListElement"
                          itemScope
                          itemType="https://schema.org/ListItem"
                        >
                          <meta itemProp="position" content={String(index + 1)} />
                          <div className={`w-12 flex items-center justify-center`} aria-label={`Rank ${index + 1}`}>
                            <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              {index + 1}
                            </div>
                          </div>
                          <article className="flex-1" itemProp="item" itemScope itemType="https://schema.org/Thing">
                            <h3 itemProp="name" className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                              {topic.name.replace(/"/g, '')}
                            </h3>
                          </article>
                          <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {topic.searchVolumeRaw}
                          </div>
                        </li>
                      ))}
                  </ol>
                  {!showFullTop10 && topics.length > 10 && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setShowFullTop10(true)}
                        className={`px-6 py-2 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg transition-colors font-medium`}
                      >
                        Show All {topics.length} Topics
                      </button>
                    </div>
                  )}
                </section>
              </>
            )}
            {topics.length > 0 && viewMode === 'list' && (
              <div className="max-w-7xl mx-auto">
                <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-md'} rounded-lg border overflow-hidden`}>
                  <div className={`hidden md:grid grid-cols-3 gap-4 px-6 py-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200'} font-semibold text-sm`}>
                    <button
                      onClick={() => handleSort('name')}
                      className={`flex items-center gap-1 hover:${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} transition-colors`}
                    >
                      Name <SortIcon field="name" />
                    </button>
                    <button
                      onClick={() => handleSort('searchVolume')}
                      className={`flex items-center justify-center gap-1 hover:${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} transition-colors`}
                    >
                      Search Volume <SortIcon field="searchVolume" />
                    </button>
                    <div className="text-center">Note</div>
                  </div>
                  <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {getSortedTopics().map((topic, index) => (
                      <div key={index} className={`${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors`}>
                        <div className="hidden md:grid grid-cols-3 gap-4 px-6 py-4">
                          <div className="font-medium">{topic.name.replace(/"/g, '')}</div>
                          <div className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{topic.searchVolumeRaw.replace(/"/g, '')}</div>
                          <div className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {topic.note || '-'}
                          </div>
                        </div>
                        <div className="md:hidden px-4 py-3 space-y-2">
                          <div className="font-medium text-base">{topic.name.replace(/"/g, '')}</div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Volume:</span>
                            <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              {topic.searchVolumeRaw.replace(/"/g, '')}
                            </span>
                          </div>
                          {topic.note && (
                            <div className="flex items-start gap-2 text-xs">
                              <span className={`font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Note:</span>
                              <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                {topic.note}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {latestPages.length > 0 && (
        <section className="max-w-7xl mx-auto mt-8 mb-0 px-4 md:px-6" aria-labelledby="latest-pages-heading">
          <h2 id="latest-pages-heading" className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Latest
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {latestPages.map((page) => {
              const sourceInfo = sources.find(s => s.value === page.source);
              return (
                <a
                  key={page.id}
                  href={page.page_url}
                  className={`group block ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50 border border-gray-200'} rounded-lg overflow-hidden shadow-md transition-all hover:shadow-lg h-full`}
                >
                  <div className="flex flex-row h-full min-h-[180px]">
                    <div className={`w-1/4 md:w-2/5 ${theme === 'dark' ? 'bg-gradient-to-br from-blue-900 to-blue-800' : 'bg-gradient-to-br from-blue-100 to-blue-50'} flex items-center justify-center p-2 md:p-4`}>
                      <div className="text-center">
                        <div className={`text-2xl md:text-4xl font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} mb-1 md:mb-2`}>
                          {sourceInfo ? sourceInfo.label.substring(0, 2).toUpperCase() : page.source.substring(0, 2).toUpperCase()}
                        </div>
                        {sourceInfo && (
                          <div className={`text-xs font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'} hidden md:block`}>
                            {sourceInfo.label}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-3/4 md:w-3/5 p-4 flex flex-col">
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        {sourceInfo ? sourceInfo.label : page.source} <span className="mx-1">|</span> {new Date(page.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <h3 className={`font-bold text-lg mb-2 ${theme === 'dark' ? 'text-white group-hover:text-blue-400' : 'text-gray-900 group-hover:text-blue-600'} transition-colors line-clamp-2`}>
                        {page.meta_title}
                      </h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
                        {page.meta_description}
                      </p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}
      </main>
      </div>
      <ComparisonPanel
        topics={topics.filter(t => comparingTopics.has(t.name))}
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
      <Footer key={`footer-${theme}`} theme={theme} />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ExplorePage />} />
        <Route path="/explore" element={<Navigate to="/" replace />} />
        <Route path="/browse-topics" element={<BrowseTopicsPage />} />
        <Route path="/browse-topics/" element={<BrowseTopicsPage />} />
        <Route path="/trending-now" element={<HomePage />} />
        <Route path="/trending-now/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/about/" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/contact/" element={<ContactPage />} />
        <Route path="/insights" element={<InsightPage />} />
        <Route path="/insights/" element={<InsightPage />} />
        <Route path="/insights-meta" element={<InsightsMetaPage />} />
        <Route path="/insights-meta/" element={<InsightsMetaPage />} />
        <Route path="/insights/:userId/:brandName" element={<BrandInsightPage />} />
        <Route path="/insights/:userId/:brandName/" element={<BrandInsightPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/upload/" element={<UploadPage />} />
        <Route path="/admin/pages" element={<AdminPages />} />
        <Route path="/admin/data" element={<AdminData />} />
        <Route path="/admin/brand-data" element={<BrandDataManager />} />
        <Route path="/admin/brand-data/:brandName" element={<BrandDataManager />} />
        <Route path="*" element={<DynamicPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
