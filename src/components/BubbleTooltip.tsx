import { TrendingTopic } from '../types';
import { TrendingUp, Clock, Tag, Star } from 'lucide-react';

interface BubbleTooltipProps {
  topic: TrendingTopic;
  x: number;
  y: number;
  theme: 'dark' | 'light';
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onCompare: () => void;
  isComparing: boolean;
}

export default function BubbleTooltip({
  topic,
  x,
  y,
  theme,
  isFavorited,
  onToggleFavorite,
  onCompare,
  isComparing
}: BubbleTooltipProps) {
  const tooltipWidth = 280;
  const tooltipHeight = 200;

  const left = x + tooltipWidth > window.innerWidth ? x - tooltipWidth - 10 : x + 10;
  const top = y + tooltipHeight > window.innerHeight ? y - tooltipHeight : y;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getSourceLabel = (source: string | null) => {
    if (!source) return 'Unknown';
    const sourceMap: { [key: string]: string } = {
      'google_trends': 'Google Trends',
      'user_upload': 'User Upload',
      'custom': 'Custom'
    };
    return sourceMap[source] || source.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div
      className={`fixed z-50 pointer-events-auto ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border rounded-lg shadow-2xl p-4 transition-all duration-200`}
      style={{ left: `${left}px`, top: `${top}px`, width: `${tooltipWidth}px` }}
    >
      <div className="space-y-3">
        <div>
          <h3 className={`font-bold text-lg mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {topic.name.replace(/"/g, '')}
          </h3>
          {topic.category && (
            <div className="flex items-center gap-1 mb-2">
              <Tag size={14} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {topic.category}
              </span>
            </div>
          )}
        </div>

        <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pt-3 space-y-2`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Search Volume
            </span>
            <div className="flex items-center gap-1">
              <TrendingUp size={14} className="text-blue-500" />
              <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {topic.searchVolumeRaw.replace(/"/g, '')}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Source
            </span>
            <span className={`text-sm font-medium px-2 py-0.5 rounded ${
              topic.source === 'user_upload'
                ? theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                : theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
            }`}>
              {getSourceLabel(topic.source)}
            </span>
          </div>

          {topic.pubDate && (
            <div className="flex items-center justify-between">
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Started
              </span>
              <div className="flex items-center gap-1">
                <Clock size={14} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {formatDate(topic.pubDate)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pt-3 flex gap-2`}>
          <button
            onClick={onToggleFavorite}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
              isFavorited
                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                : theme === 'dark'
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Star size={14} fill={isFavorited ? 'currentColor' : 'none'} />
            {isFavorited ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={onCompare}
            className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
              isComparing
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : theme === 'dark'
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isComparing ? 'Selected' : 'Compare'}
          </button>
        </div>

        {topic.url && (
          <a
            href={topic.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`block text-center text-sm font-medium ${
              theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            } transition-colors`}
          >
            Learn more →
          </a>
        )}
      </div>
    </div>
  );
}
