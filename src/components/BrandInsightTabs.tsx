import { BarChart3, ListTree, Bookmark, TrendingUp, DollarSign, GitCompare } from 'lucide-react';

interface BrandInsightTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  theme: 'light' | 'dark';
}

export default function BrandInsightTabs({ activeTab, onTabChange, theme }: BrandInsightTabsProps) {
  const tabs = [
    { id: 'compare', label: 'Compare Brands', icon: GitCompare },
    { id: 'charts', label: 'Charts & Graph Visualization', icon: BarChart3 },
    { id: 'list', label: 'List View', icon: ListTree },
    { id: 'tracked', label: 'Tracked Items', icon: Bookmark },
    { id: 'seo', label: 'Content Marketing & SEO', icon: TrendingUp },
    { id: 'ppc', label: 'PPC & ROAS', icon: DollarSign },
  ];

  return (
    <div className={`border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
      <div className="max-w-7xl mx-auto px-2 md:px-6">
        <div className="flex overflow-x-auto scrollbar-thin">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-4 whitespace-nowrap font-medium text-sm
                  border-b-2 transition-all duration-200
                  ${isActive
                    ? theme === 'dark'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-blue-600 text-blue-600'
                    : theme === 'dark'
                      ? 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
