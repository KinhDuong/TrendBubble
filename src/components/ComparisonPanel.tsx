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
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${topics.length}, minmax(250px, 1fr))` }}>
            {topics.map((topic) => {
              const volumePercentage = (topic.searchVolume / maxVolume) * 100;

              return (
                <div
                  key={topic.name}
                  className={`${
                    theme === 'dark' ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'
                  } border rounded-lg p-4 relative`}
                >
                  <button
                    onClick={() => onRemoveTopic(topic.name)}
                    className={`absolute top-2 right-2 p-1 rounded hover:${
                      theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                    } transition-colors`}
                  >
                    <X size={14} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
                  </button>

                  <h4 className={`font-bold text-sm mb-3 pr-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {topic.name.replace(/"/g, '')}
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Search Volume
                        </span>
                        <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {topic.searchVolumeRaw.replace(/"/g, '')}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${volumePercentage}%` }}
                        />
                      </div>
                    </div>

                    {topic.category && (
                      <div className="flex items-center gap-1">
                        <Tag size={12} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {topic.category}
                        </span>
                      </div>
                    )}

                    {topic.pubDate && (
                      <div className="flex items-center gap-1">
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
