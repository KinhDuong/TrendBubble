import { X, Play, Pause, Moon, Sun, Circle, BarChart3, List, LayoutGrid, PieChart } from 'lucide-react';
import { CryptoTimeframe } from '../types';

export type BubbleLayout = 'force' | 'hierarchical' | 'grid' | 'circular' | 'timeline' | 'packed' | 'scatter' | 'importance';

export type ViewMode = 'bubble' | 'bar' | 'list' | 'treemap' | 'donut';

export type Shape = 'bubble' | 'square' | 'rounded-square' | 'hexagon' | 'diamond' | 'triangle' | 'star' | 'shark';

interface FilterMenuProps {
  theme: 'dark' | 'light';
  loading: boolean;
  viewMode: ViewMode;
  dateFilter: 'now' | 'all' | '24h' | 'week' | 'month' | 'year';
  categoryFilter: string;
  categories: string[];
  sourceFilter?: string;
  sources?: string[];
  maxBubbles?: number;
  searchQuery?: string;
  isPaused?: boolean;
  nextBubbleIn?: string;
  bubbleProgress?: number;
  nextUpdateIn?: string;
  updateProgress?: number;
  bubbleLayout?: BubbleLayout;
  shape?: Shape;
  cryptoTimeframe?: CryptoTimeframe;
  showCryptoTimeframe?: boolean;
  showDateFilter?: boolean;
  showCategoryFilter?: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onDateFilterChange: (filter: 'now' | 'all' | '24h' | 'week' | 'month' | 'year') => void;
  onCategoryFilterChange: (category: string) => void;
  onSourceFilterChange?: (source: string) => void;
  onMaxBubblesChange?: (max: number) => void;
  onThemeChange: (theme: 'dark' | 'light') => void;
  onSearchQueryChange?: (query: string) => void;
  onSearchClear?: () => void;
  onRefresh?: () => void;
  onPauseToggle?: () => void;
  onBubbleLayoutChange?: (layout: BubbleLayout) => void;
  onShapeChange?: (shape: Shape) => void;
  onCryptoTimeframeChange?: (timeframe: CryptoTimeframe) => void;
  variant?: 'homepage' | 'bubble';
}

export default function FilterMenu({
  theme,
  loading,
  viewMode,
  dateFilter,
  categoryFilter,
  categories,
  sourceFilter,
  sources,
  maxBubbles,
  searchQuery,
  isPaused,
  nextBubbleIn,
  bubbleProgress,
  nextUpdateIn,
  updateProgress,
  bubbleLayout = 'force',
  shape = 'bubble',
  cryptoTimeframe = '1h',
  showCryptoTimeframe = false,
  showDateFilter = true,
  showCategoryFilter = true,
  onViewModeChange,
  onDateFilterChange,
  onCategoryFilterChange,
  onSourceFilterChange,
  onMaxBubblesChange,
  onThemeChange,
  onSearchQueryChange,
  onSearchClear,
  onRefresh,
  onPauseToggle,
  onBubbleLayoutChange,
  onShapeChange,
  onCryptoTimeframeChange,
  variant = 'homepage'
}: FilterMenuProps) {
  if (loading) return null;

  const Divider = () => (
    <div className={`${variant === 'homepage' ? 'hidden md:block' : ''} w-px h-${variant === 'homepage' ? '6' : '4 md:h-6'} ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
  );

  if (variant === 'bubble') {
    return (
      <div className={`sticky top-16 z-40 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-[0_2px_4px_rgba(0,0,0,0.15)]`}>
        <div className="px-4 md:px-6 py-3">
          <div className="flex items-center justify-center">
            <div className="overflow-x-auto">
              <div className="flex items-center gap-2 md:gap-4">
                {(viewMode === 'bubble' || viewMode === 'bar' || viewMode === 'treemap' || viewMode === 'donut') && maxBubbles !== undefined && onMaxBubblesChange && (
                  <>
                    <button
                      onClick={() => onMaxBubblesChange(10)}
                      className={`px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium rounded transition-colors whitespace-nowrap ${
                        maxBubbles === 10
                          ? 'bg-blue-600 text-white'
                          : theme === 'dark'
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                            : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      Top 10
                    </button>
                    <label htmlFor="maxBubbles" className={`text-xs md:text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Max:
                    </label>
                    <select
                      id="maxBubbles"
                      value={maxBubbles}
                      onChange={(e) => onMaxBubblesChange(Number(e.target.value))}
                      className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={40}>40</option>
                      <option value={50}>50</option>
                      <option value={80}>80</option>
                      <option value={100}>100</option>
                      <option value={150}>150</option>
                      <option value={200}>200</option>
                      <option value={1000}>1000</option>
                    </select>
                    <Divider />
                  </>
                )}
                {showCryptoTimeframe && onCryptoTimeframeChange && (
                  <>
                    <label htmlFor="cryptoTimeframe" className={`text-xs md:text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Timeframe:
                    </label>
                    <select
                      id="cryptoTimeframe"
                      value={cryptoTimeframe}
                      onChange={(e) => onCryptoTimeframeChange(e.target.value as CryptoTimeframe)}
                      className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="1h">1 Hour</option>
                      <option value="24h">24 Hours</option>
                      <option value="7d">7 Days</option>
                      <option value="30d">30 Days</option>
                      <option value="1y">1 Year</option>
                    </select>
                    <Divider />
                  </>
                )}
                {viewMode === 'bubble' && onBubbleLayoutChange && (
                  <>
                    <label htmlFor="bubbleLayout" className={`text-xs md:text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Layout:
                    </label>
                    <select
                      id="bubbleLayout"
                      value={bubbleLayout}
                      onChange={(e) => onBubbleLayoutChange(e.target.value as BubbleLayout)}
                      className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="force">Force-Directed</option>
                      <option value="hierarchical">Hierarchical</option>
                      <option value="grid">Grid</option>
                      <option value="circular">Circular</option>
                      <option value="timeline">Timeline</option>
                      <option value="packed">Packed</option>
                      <option value="scatter">Scatter</option>
                      <option value="importance">Importance</option>
                    </select>
                    <Divider />
                  </>
                )}
                {viewMode === 'bubble' && onShapeChange && (
                  <>
                    <label htmlFor="shape" className={`text-xs md:text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Shape:
                    </label>
                    <select
                      id="shape"
                      value={shape}
                      onChange={(e) => onShapeChange(e.target.value as Shape)}
                      className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="bubble">Bubble</option>
                      <option value="square">Square</option>
                      <option value="rounded-square">Rounded Square</option>
                      <option value="hexagon">Hexagon</option>
                      <option value="diamond">Diamond</option>
                      <option value="triangle">Triangle</option>
                      <option value="star">Star</option>
                      <option value="shark">Shark</option>
                    </select>
                    <Divider />
                  </>
                )}
                {showCategoryFilter && (
                  <>
                    <label htmlFor="categoryFilter" className={`text-xs md:text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Category:
                    </label>
                    <select
                      id="categoryFilter"
                      value={categoryFilter}
                      onChange={(e) => onCategoryFilterChange(e.target.value)}
                      className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="all">All</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <Divider />
                  </>
                )}
                {sourceFilter !== undefined && sources && onSourceFilterChange && (
                  <>
                    <label htmlFor="sourceFilter" className={`text-xs md:text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Source:
                    </label>
                    <select
                      id="sourceFilter"
                      value={sourceFilter}
                      onChange={(e) => onSourceFilterChange(e.target.value)}
                      className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="all">All</option>
                      {sources.map(source => (
                        <option key={source} value={source}>
                          {source === 'google_trends' ? 'Google Trends' : source.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </option>
                      ))}
                    </select>
                    <Divider />
                  </>
                )}
                {showDateFilter && !showCryptoTimeframe && (
                  <>
                    <label htmlFor="dateFilter" className={`text-xs md:text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Date:
                    </label>
                    <select
                      id="dateFilter"
                      value={dateFilter}
                      onChange={(e) => onDateFilterChange(e.target.value as 'now' | 'all' | '24h' | 'week' | 'month' | 'year')}
                      className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="now">Now</option>
                      <option value="all">All Time</option>
                      <option value="24h">24 Hours</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                    </select>
                    <Divider />
                  </>
                )}
                <div className={`flex items-center gap-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded p-1`}>
                  <button
                    onClick={() => onThemeChange('dark')}
                    className={`flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium rounded transition-colors ${
                      theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Moon size={16} />
                    Dark
                  </button>
                  <button
                    onClick={() => onThemeChange('light')}
                    className={`flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium rounded transition-colors ${
                      theme === 'light'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:text-gray-100'
                    }`}
                  >
                    <Sun size={16} />
                    Light
                  </button>
                </div>
                <Divider />
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded p-1`}>
                    <button
                      onClick={() => onViewModeChange('bubble')}
                      className={`flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium rounded transition-colors ${
                        viewMode === 'bubble'
                          ? 'bg-blue-600 text-white'
                          : theme === 'dark' ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900'
                      }`}
                      aria-label="Bubble Chart View"
                    >
                      <Circle size={14} />
                      Bubble
                    </button>
                    <button
                      onClick={() => onViewModeChange('bar')}
                      className={`flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium rounded transition-colors ${
                        viewMode === 'bar'
                          ? 'bg-blue-600 text-white'
                          : theme === 'dark' ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900'
                      }`}
                      aria-label="Bar Chart View"
                    >
                      <BarChart3 size={14} />
                      Bar
                    </button>
                    <button
                      onClick={() => onViewModeChange('list')}
                      className={`flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium rounded transition-colors ${
                        viewMode === 'list'
                          ? 'bg-blue-600 text-white'
                          : theme === 'dark' ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900'
                      }`}
                      aria-label="List View"
                    >
                      <List size={14} />
                      List
                    </button>
                    <button
                      onClick={() => onViewModeChange('treemap')}
                      className={`flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium rounded transition-colors ${
                        viewMode === 'treemap'
                          ? 'bg-blue-600 text-white'
                          : theme === 'dark' ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900'
                      }`}
                      aria-label="Treemap View"
                    >
                      <LayoutGrid size={14} />
                      Tree
                    </button>
                    <button
                      onClick={() => onViewModeChange('donut')}
                      className={`flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium rounded transition-colors ${
                        viewMode === 'donut'
                          ? 'bg-blue-600 text-white'
                          : theme === 'dark' ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900'
                      }`}
                      aria-label="Donut Chart View"
                    >
                      <PieChart size={14} />
                      Donut
                    </button>
                  </div>
                  {onPauseToggle && (
                    <button
                      onClick={onPauseToggle}
                      className={`px-3 md:px-4 py-1 md:py-1.5 text-xs md:text-sm font-medium ${theme === 'dark' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-orange-500 hover:bg-orange-600'} rounded transition-colors text-white flex items-center gap-1`}
                    >
                      {isPaused ? <Play size={14} /> : <Pause size={14} />}
                      {isPaused ? 'Resume' : 'Pause'}
                    </button>
                  )}
                  {nextUpdateIn !== undefined && updateProgress !== undefined && (
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                      <div className="relative h-3 w-3">
                        <svg className="h-3 w-3 -rotate-90" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
                          <circle
                            cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"
                            strokeDasharray={`${2 * Math.PI * 10}`}
                            strokeDashoffset={`${2 * Math.PI * 10 * (1 - updateProgress / 100)}`}
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <span className="text-xs font-mono">{nextUpdateIn}</span>
                    </div>
                  )}
                  {nextBubbleIn !== undefined && bubbleProgress !== undefined && (
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${theme === 'dark' ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                      <div className="relative h-3 w-3">
                        <svg className="h-3 w-3 -rotate-90" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
                          <circle
                            cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"
                            strokeDasharray={`${2 * Math.PI * 10}`}
                            strokeDashoffset={`${2 * Math.PI * 10 * (1 - bubbleProgress / 100)}`}
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <span className="text-xs font-mono">{nextBubbleIn}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <nav className={`sticky top-16 z-40 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-[0_2px_4px_rgba(0,0,0,0.15)]`} aria-label="Trending topics filters">
      <div className="px-4 md:px-6 py-3">
        <div className="flex items-center justify-center">
          <div className="overflow-x-auto">
            <div className="flex items-center gap-3 md:gap-4">
              <div className={`flex items-center gap-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded p-1`}>
                <button
                  onClick={() => onViewModeChange('bubble')}
                  className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    viewMode === 'bubble'
                      ? 'bg-blue-600 text-white'
                      : theme === 'dark' ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label="Bubble Chart View"
                >
                  <Circle size={14} />
                  Bubble
                </button>
                <button
                  onClick={() => onViewModeChange('bar')}
                  className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    viewMode === 'bar'
                      ? 'bg-blue-600 text-white'
                      : theme === 'dark' ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label="Bar Chart View"
                >
                  <BarChart3 size={14} />
                  Bar
                </button>
                <button
                  onClick={() => onViewModeChange('list')}
                  className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : theme === 'dark' ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label="List View"
                >
                  <List size={14} />
                  List
                </button>
                <button
                  onClick={() => onViewModeChange('treemap')}
                  className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    viewMode === 'treemap'
                      ? 'bg-blue-600 text-white'
                      : theme === 'dark' ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label="Treemap View"
                >
                  <LayoutGrid size={14} />
                  Tree
                </button>
                <button
                  onClick={() => onViewModeChange('donut')}
                  className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    viewMode === 'donut'
                      ? 'bg-blue-600 text-white'
                      : theme === 'dark' ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label="Donut Chart View"
                >
                  <PieChart size={14} />
                  Donut
                </button>
              </div>
              {onRefresh && nextBubbleIn !== undefined && bubbleProgress !== undefined && (
                <button
                  onClick={onRefresh}
                  className={`flex items-center gap-1 px-2 md:px-4 py-1.5 text-xs font-medium ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} rounded transition-colors text-white whitespace-nowrap`}
                  aria-label="Refresh trending topics"
                  title="Refresh trending topics"
                >
                  <div className="relative h-3 w-3">
                    <svg className="h-3 w-3 -rotate-90" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
                      <circle
                        cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeDasharray={`${2 * Math.PI * 10}`}
                        strokeDashoffset={`${2 * Math.PI * 10 * (1 - bubbleProgress / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <span className="text-xs font-mono">{nextBubbleIn}</span>
                </button>
              )}
              <Divider />
              {showDateFilter && !showCryptoTimeframe && (
                <>
                  <div className="flex items-center gap-2">
                    <select
                      id="dateFilter"
                      value={dateFilter}
                      onChange={(e) => onDateFilterChange(e.target.value as 'now' | 'all' | '24h' | 'week' | 'month' | 'year')}
                      className={`flex-1 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      aria-label="Filter trending topics by date range"
                    >
                      <option value="now">Trending Now</option>
                      <option value="all">All Time</option>
                      <option value="24h">24 Hours</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                    </select>
                  </div>
                  <Divider />
                </>
              )}
              {showCryptoTimeframe && onCryptoTimeframeChange && (
                <>
                  <div className="flex items-center gap-2">
                    <label htmlFor="cryptoTimeframe" className={`text-xs font-medium whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Timeframe:
                    </label>
                    <select
                      id="cryptoTimeframe"
                      value={cryptoTimeframe}
                      onChange={(e) => onCryptoTimeframeChange(e.target.value as CryptoTimeframe)}
                      className={`flex-1 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      aria-label="Select crypto timeframe"
                    >
                      <option value="1h">1 Hour</option>
                      <option value="24h">24 Hours</option>
                      <option value="7d">7 Days</option>
                      <option value="30d">30 Days</option>
                      <option value="1y">1 Year</option>
                    </select>
                  </div>
                  <Divider />
                </>
              )}
              {showCategoryFilter && (
                <>
                  <div className="flex items-center gap-2">
                    <select
                      id="categoryFilter"
                      value={categoryFilter}
                      onChange={(e) => onCategoryFilterChange(e.target.value)}
                      className={`flex-1 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      aria-label="Filter trending topics by category"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <Divider />
                </>
              )}
              {(viewMode === 'bubble' || viewMode === 'bar' || viewMode === 'treemap' || viewMode === 'donut') && maxBubbles !== undefined && onMaxBubblesChange && (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onMaxBubblesChange(10)}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                        maxBubbles === 10
                          ? 'bg-blue-600 text-white'
                          : theme === 'dark'
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                            : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      Top 10
                    </button>
                    <label htmlFor="maxBubbles" className={`text-xs font-medium whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Max:
                    </label>
                    <select
                      id="maxBubbles"
                      value={maxBubbles}
                      onChange={(e) => onMaxBubblesChange(Number(e.target.value))}
                      className={`flex-1 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      aria-label="Maximum number of bubbles to display"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={40}>40</option>
                      <option value={50}>50</option>
                      <option value={80}>80</option>
                      <option value={100}>100</option>
                      <option value={150}>150</option>
                      <option value={200}>200</option>
                      <option value={1000}>1000</option>
                    </select>
                  </div>
                  <Divider />
                </>
              )}
              {viewMode === 'bubble' && onBubbleLayoutChange && (
                <>
                  <div className="flex items-center gap-2">
                    <label htmlFor="bubbleLayout" className={`text-xs font-medium whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Layout:
                    </label>
                    <select
                      id="bubbleLayout"
                      value={bubbleLayout}
                      onChange={(e) => onBubbleLayoutChange(e.target.value as BubbleLayout)}
                      className={`flex-1 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      aria-label="Select bubble chart layout"
                    >
                      <option value="force">Force-Directed</option>
                      <option value="hierarchical">Hierarchical</option>
                      <option value="grid">Grid</option>
                      <option value="circular">Circular</option>
                      <option value="timeline">Timeline</option>
                      <option value="packed">Packed</option>
                      <option value="scatter">Scatter</option>
                      <option value="importance">Importance</option>
                    </select>
                  </div>
                  <Divider />
                </>
              )}
              {viewMode === 'bubble' && onShapeChange && (
                <>
                  <div className="flex items-center gap-2">
                    <label htmlFor="shape" className={`text-xs font-medium whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Shape:
                    </label>
                    <select
                      id="shape"
                      value={shape}
                      onChange={(e) => onShapeChange(e.target.value as Shape)}
                      className={`flex-1 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      aria-label="Select bubble shape"
                    >
                      <option value="bubble">Bubble</option>
                      <option value="square">Square</option>
                      <option value="rounded-square">Rounded Square</option>
                      <option value="hexagon">Hexagon</option>
                      <option value="diamond">Diamond</option>
                      <option value="triangle">Triangle</option>
                      <option value="star">Star</option>
                      <option value="shark">Shark</option>
                    </select>
                  </div>
                  <Divider />
                </>
              )}
              <div className="flex items-center gap-2">
                <div className={`flex-1 flex items-center gap-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded p-1`}>
                  <button
                    onClick={() => onThemeChange('dark')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-colors ${
                      theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Moon size={14} />
                    Dark
                  </button>
                  <button
                    onClick={() => onThemeChange('light')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-colors ${
                      theme === 'light'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:text-gray-100'
                    }`}
                  >
                    <Sun size={14} />
                    Light
                  </button>
                </div>
              </div>
              <Divider />
              {onSearchQueryChange && onSearchClear && (
                <div className="flex items-center gap-1">
                  <input
                    id="searchQuery"
                    type="text"
                    value={searchQuery || ''}
                    onChange={(e) => {
                      onSearchQueryChange(e.target.value);
                      if (e.target.value.trim()) {
                        onViewModeChange('list');
                      }
                    }}
                    placeholder="Search bubbles..."
                    className={`flex-1 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]`}
                    aria-label="Search trending topics"
                  />
                  {searchQuery && (
                    <button
                      onClick={onSearchClear}
                      className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600 text-white' : 'hover:bg-gray-200 text-gray-900'} rounded transition-colors`}
                      aria-label="Clear search and return to bubble view"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
