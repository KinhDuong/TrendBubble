import { TrendingTopic, CryptoTimeframe } from '../types';
import { TrendingUp, Tag, Pin, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface BubbleTooltipProps {
  topic: TrendingTopic;
  x: number;
  y: number;
  theme: 'dark' | 'light';
  isPinned: boolean;
  onTogglePin: () => void;
  onCompare: () => void;
  isComparing: boolean;
  onClose: () => void;
  cryptoTimeframe?: CryptoTimeframe;
}

export default function BubbleTooltip({
  topic,
  x,
  y,
  theme,
  isPinned,
  onTogglePin,
  onCompare,
  isComparing,
  onClose,
  cryptoTimeframe = '1h'
}: BubbleTooltipProps) {
  const isMobile = window.innerWidth < 768;
  const tooltipWidth = 280;
  const tooltipHeight = 200;
  const offset = 10;
  const padding = 20;

  let left = x + offset;
  let top = y;

  if (left + tooltipWidth > window.innerWidth - padding) {
    left = x - tooltipWidth - offset;
  }
  if (left < padding) {
    left = padding;
  }

  if (top + tooltipHeight > window.innerHeight - padding) {
    top = window.innerHeight - tooltipHeight - padding;
  }
  if (top < padding) {
    top = padding;
  }

  const getSourceLabel = (source: string | null) => {
    if (!source) return 'Unknown';
    const sourceMap: { [key: string]: string } = {
      'google_trends': 'Google Trends',
      'user_upload': 'User Upload',
      'custom': 'Custom'
    };
    return sourceMap[source] || source.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getDisplayVolume = () => {
    if (topic.crypto_data && topic.source === 'coingecko_crypto') {
      const timeframeMap = {
        '1h': topic.crypto_data.formatted.change_1h,
        '24h': topic.crypto_data.formatted.change_24h,
        '7d': topic.crypto_data.formatted.change_7d,
        '30d': topic.crypto_data.formatted.change_30d,
        '1y': topic.crypto_data.formatted.change_1y,
      };
      const timeframeLabel = {
        '1h': '1h',
        '24h': '24h',
        '7d': '7d',
        '30d': '30d',
        '1y': '1y',
      };
      return `${timeframeMap[cryptoTimeframe]}% (${timeframeLabel[cryptoTimeframe]}) • ${topic.crypto_data.formatted.price} • ${topic.crypto_data.formatted.volume}`;
    }
    return topic.searchVolumeRaw.replace(/"/g, '');
  };

  if (isMobile) {
    return createPortal(
      <>
        <div
          className="fixed inset-0 bg-black/50 animate-in fade-in duration-200"
          style={{ zIndex: 9998 }}
          onClick={onClose}
        />
        <div
          className={`fixed bottom-0 left-0 right-0 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          } rounded-t-2xl shadow-2xl p-4 pb-6 animate-in slide-in-from-bottom duration-300`}
          style={{ zIndex: 9999 }}
        >
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-full ${
              theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
            } transition-colors`}
          >
            <X size={18} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
          </button>
          <div className="space-y-4">
            <div>
              <h3 className={`font-bold text-xl mb-2 pr-10 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {topic.name.replace(/"/g, '')}
              </h3>
              {topic.category && (
                <div className="flex items-center gap-1">
                  <Tag size={14} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {topic.category}
                  </span>
                </div>
              )}
            </div>

            <div className={`border-t ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            } pt-4 space-y-3`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Search Volume
                </span>
                <div className="flex items-center gap-1">
                  <TrendingUp size={16} className="text-blue-500" />
                  <span className={`font-semibold text-base ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {getDisplayVolume()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Source
                </span>
                <span className={`text-sm font-medium px-2 py-1 rounded ${
                  topic.source === 'user_upload'
                    ? theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                    : theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                }`}>
                  {getSourceLabel(topic.source)}
                </span>
              </div>

              {topic.note && (
                <div className="flex flex-col gap-2">
                  <span className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Note
                  </span>
                  <span className={`text-sm leading-relaxed ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {topic.note}
                  </span>
                </div>
              )}
            </div>

            <div className={`border-t ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            } pt-4 flex gap-3`}>
              <button
                onClick={onTogglePin}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  isPinned
                    ? 'bg-purple-500 text-white hover:bg-purple-600 active:bg-purple-700'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 active:bg-gray-500'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                <Pin size={16} className={isPinned ? 'rotate-45' : ''} />
                {isPinned ? 'Pinned' : 'Pin'}
              </button>
              <button
                onClick={onCompare}
                className={`flex-1 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  isComparing
                    ? 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 active:bg-gray-500'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
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
                className={`block text-center text-base font-medium py-2 ${
                  theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                } transition-colors`}
              >
                Learn more →
              </a>
            )}
          </div>
        </div>
      </>,
      document.body
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{ background: 'transparent' }}
      />
      <div
        className={`fixed z-50 ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border rounded-lg shadow-2xl p-4`}
        style={{ left: `${left}px`, top: `${top}px`, width: `${tooltipWidth}px` }}
      >
        <button
          onClick={onClose}
          className={`absolute top-2 right-2 p-1 rounded-full hover:${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
          } transition-colors`}
        >
          <X size={16} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
        </button>
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
                {getDisplayVolume()}
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

          {topic.note && (
            <div className="flex flex-col gap-2">
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Note
              </span>
              <span className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {topic.note}
              </span>
            </div>
          )}
        </div>

        <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pt-3 flex gap-2`}>
          <button
            onClick={onTogglePin}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
              isPinned
                ? 'bg-purple-500 text-white hover:bg-purple-600'
                : theme === 'dark'
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Pin size={14} className={isPinned ? 'rotate-45' : ''} />
            {isPinned ? 'Pinned' : 'Pin'}
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
    </>
  );
}
