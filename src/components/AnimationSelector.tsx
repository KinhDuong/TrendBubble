import { Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export type AnimationStyle = 'default' | 'bounce' | 'elastic' | 'spiral' | 'drop' | 'pulse' | 'shimmer';

interface AnimationSelectorProps {
  theme: 'dark' | 'light';
  selectedAnimation: AnimationStyle;
  onAnimationChange: (animation: AnimationStyle) => void;
}

const animations: { value: AnimationStyle; label: string; description: string }[] = [
  { value: 'default', label: 'Default', description: 'Smooth fade-in with easing' },
  { value: 'bounce', label: 'Bounce', description: 'Overshoots then settles back' },
  { value: 'elastic', label: 'Elastic', description: 'Spring physics with oscillation' },
  { value: 'spiral', label: 'Spiral', description: 'Spin while growing' },
  { value: 'drop', label: 'Drop', description: 'Fall from above with gravity' },
  { value: 'pulse', label: 'Pulse', description: 'Pulsing glow effect' },
  { value: 'shimmer', label: 'Shimmer', description: 'Magical sparkle appearance' },
];

export default function AnimationSelector({ theme, selectedAnimation, onAnimationChange }: AnimationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all ${
          theme === 'dark'
            ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl'
            : 'bg-blue-500 hover:bg-blue-600 hover:shadow-xl'
        } text-white font-medium`}
        aria-label="Animation style"
        title="Animation style"
      >
        <Sparkles size={20} />
        <span className="hidden md:inline">Animation</span>
      </button>

      {isOpen && (
        <div
          className={`absolute bottom-full right-0 mb-2 w-72 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border rounded-lg shadow-lg z-50`}
        >
          <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`font-semibold text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
              Animation Style
            </div>
            <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Choose how bubbles appear
            </div>
          </div>
          <div className="py-2 max-h-96 overflow-y-auto">
            {animations.map((animation) => (
              <button
                key={animation.value}
                onClick={() => {
                  onAnimationChange(animation.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  selectedAnimation === animation.value
                    ? theme === 'dark'
                      ? 'bg-blue-900/30 text-blue-400'
                      : 'bg-blue-50 text-blue-600'
                    : theme === 'dark'
                    ? 'hover:bg-gray-700 text-gray-300'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="font-medium text-sm">{animation.label}</div>
                <div
                  className={`text-xs mt-1 ${
                    selectedAnimation === animation.value
                      ? theme === 'dark'
                        ? 'text-blue-300'
                        : 'text-blue-500'
                      : theme === 'dark'
                      ? 'text-gray-400'
                      : 'text-gray-500'
                  }`}
                >
                  {animation.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
