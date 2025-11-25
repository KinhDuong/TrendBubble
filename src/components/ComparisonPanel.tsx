import { X, TrendingUp, Calendar, Tag } from 'lucide-react';
import { TrendingTopic } from '../types';

interface ComparisonPanelProps {
  topics: TrendingTopic[];
  theme: 'dark' | 'light';
  onClose: () => void;
  onRemoveTopic: (topicName: string) => void;
}

export default function ComparisonPanel({ topics, theme, onClose, onRemoveTopic }: ComparisonPanelProps) {
  if (topics.length === 0) return null;

  const maxVolume = Math.max(...topics.map(t => t.searchVolume));
  const minSize = 80;
  const maxSize = 200;

  const getBubbleSize = (volume: number) => {
    const ratio = volume / maxVolume;
    return minSize + (maxSize - minSize) * ratio;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border-t shadow-2xl transition-all duration-300`}
      style={{ maxHeight: '50vh' }}
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} size={20} />
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Topic Comparison ({topics.length}/5)
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded hover:${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}
          >
            <X size={20} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
          </button>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex items-end justify-center gap-8 py-8 min-h-[280px]">
            {topics.map((topic) => {
              const size = getBubbleSize(topic.searchVolume);
              const fontSize = Math.max(10, size / 12);

              return (
                <div
                  key={topic.name}
                  className="flex flex-col items-center gap-3 relative"
                  style={{ minWidth: `${maxSize + 40}px` }}
                >
                  <button
                    onClick={() => onRemoveTopic(topic.name)}
                    className={`absolute -top-2 -right-2 z-10 p-1.5 rounded-full ${
                      theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                    } transition-colors shadow-lg`}
                  >
                    <X size={14} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
                  </button>

                  <div
                    className="relative flex items-center justify-center rounded-full shadow-lg transition-all duration-500"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      background: `radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.9), rgba(37, 99, 235, 0.95))`,
                    }}
                  >
                    <div className="text-center px-3">
                      <div
                        className="font-bold text-white break-words"
                        style={{ fontSize: `${fontSize}px`, lineHeight: '1.2' }}
                      >
                        {topic.name.replace(/"/g, '')}
                      </div>
                      <div
                        className="text-white/80 mt-1"
                        style={{ fontSize: `${fontSize * 0.7}px` }}
                      >
                        {topic.searchVolumeRaw.replace(/"/g, '')}
                      </div>
                    </div>
                  </div>

                  <div className="text-center space-y-1 max-w-[200px]">
                    {topic.category && (
                      <div className="flex items-center justify-center gap-1">
                        <Tag size={12} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {topic.category}
                        </span>
                      </div>
                    )}

                    {topic.pubDate && (
                      <div className="flex items-center justify-center gap-1">
                        <Calendar size={12} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {formatDate(topic.pubDate)}
                        </span>
                      </div>
                    )}

                    {topic.url && (
                      <a
                        href={topic.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block text-xs font-medium ${
                          theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                        } transition-colors`}
                      >
                        Learn more →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {topics.length < 5 && (
          <p className={`text-xs text-center mt-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            Click "Compare" on more bubbles to add them (up to 5 topics)
          </p>
        )}
      </div>
    </div>
  );
}
