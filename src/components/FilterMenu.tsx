import { X, Play, Pause, Moon, Sun } from 'lucide-react';

export type BubbleLayout = 'force' | 'hierarchical' | 'grid' | 'circular' | 'timeline' | 'packed' | 'scatter' | 'importance';

interface FilterMenuProps {
  theme: 'dark' | 'light';
  loading: boolean;
  viewMode: 'bubble' | 'list';
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
  onViewModeChange: (mode: 'bubble' | 'list') => void;
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
  variant = 'homepage'
}: FilterMenuProps) {
  if (loading) return null;

  const Divider = () => (
    <div className={`${variant === 'homepage' ? 'hidden md:block' : ''} w-px h-${variant === 'homepage' ? '6' : '4 md:h-6'} ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
  );

  if (variant === 'bubble') {
    return (
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]'}`}>
        <div className="px-4 md:px-6 py-3">
          <div className="flex items-center justify-center">
            <div className="overflow-x-auto">
              <div className="flex items-center gap-2 md:gap-4">
                {viewMode === 'bubble' && maxBubbles !== undefined && onMaxBubblesChange && (
                  <>
                    <label htmlFor="maxBubbles" className={`text-xs md:text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Max:
                    </label>
                    <select
                      id="maxBubbles"
                      value={maxBubbles}
                      onChange={(e) => onMaxBubblesChange(Number(e.target.value))}
                      className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value={20}>20</option>
                      <option value={40}>40</option>
                      <option value={50}>50</option>
                      <option value={80}>80</option>
                      <option value={100}>100</option>
                      <option value={150}>150</option>
                      <option value={200}>200</option>
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
                <button
                  onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
                  className={`flex items-center gap-1.5 px-3 md:px-4 py-1 md:py-1.5 text-xs md:text-sm font-medium ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} rounded transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                  {theme === 'dark' ? 'Light' : 'Dark'}
                </button>
                <Divider />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onViewModeChange(viewMode === 'bubble' ? 'list' : 'bubble')}
                    className={`px-3 md:px-4 py-1 md:py-1.5 text-xs md:text-sm font-medium ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} rounded transition-colors text-white`}
                  >
                    {viewMode === 'bubble' ? 'List' : 'Bubble'}
                  </button>
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
    <nav className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]'}`} aria-label="Trending topics filters">
      <div className="px-4 md:px-6 py-3">
        <div className="flex items-center justify-center">
          <div className="overflow-x-auto">
            <div className="flex items-center gap-3 md:gap-4">
              <button
                onClick={() => onViewModeChange(viewMode === 'bubble' ? 'list' : 'bubble')}
                className={`px-4 py-1.5 text-xs font-medium ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} rounded transition-colors text-white whitespace-nowrap`}
                aria-label={`Switch to ${viewMode === 'bubble' ? 'list' : 'bubble'} view`}
              >
                {viewMode === 'bubble' ? 'List' : 'Bubble'}
              </button>
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
              {viewMode === 'bubble' && maxBubbles !== undefined && onMaxBubblesChange && (
                <>
                  <div className="flex items-center gap-2">
                    <label htmlFor="maxBubbles" className={`text-xs font-medium whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Bubbles:
                    </label>
                    <select
                      id="maxBubbles"
                      value={maxBubbles}
                      onChange={(e) => onMaxBubblesChange(Number(e.target.value))}
                      className={`flex-1 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      aria-label="Maximum number of bubbles to display"
                    >
                      <option value={20}>20</option>
                      <option value={40}>40</option>
                      <option value={50}>50</option>
                      <option value={80}>80</option>
                      <option value={100}>100</option>
                      <option value={150}>150</option>
                      <option value={200}>200</option>
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-medium ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} rounded transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                  {theme === 'dark' ? 'Light' : 'Dark'}
                </button>
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
