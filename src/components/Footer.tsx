import { BarChart3 } from 'lucide-react';

interface FooterProps {
  theme: 'dark' | 'light';
}

export default function Footer({ theme }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-600 shadow-inner'} border-t`}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-start">
            <div className={`relative w-16 h-16 flex-shrink-0 rounded-full shadow-lg border-4 border-blue-600 overflow-hidden flex items-center justify-center ${theme === 'dark' ? 'bg-transparent' : 'bg-transparent'}`}>
              <BarChart3 size={32} strokeWidth={4} className="text-blue-600 relative z-10" />
            </div>
          </div>

          <div>
            <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Features
            </h3>
            <ul className="text-sm space-y-2">
              <li>Top List – Quickly browse the highest-ranked items in a clean, easy-to-read format</li>
              <li>Bubble Chart – Visualize data based on scale and impact</li>
              <li>Bar Chart – Compare items side-by-side with clarity</li>
              <li>Donut Chart – View proportional breakdowns in a modern, intuitive layout</li>
              <li>Treemap – Explore hierarchical data with a clear visual structure</li>
            </ul>
          </div>

          <div>
            <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              About
            </h3>
            <p className="text-sm">
              We turn boring rankings into beautiful, interactive stories.
              Every bubble, bar, and sparkline is built from the latest official data and refreshed the moment new numbers drop. No fluff, no paywalls - just the clearest and most up-to-date data. Made by data nerds, for the endlessly curious.
            </p>
          </div>
        </div>

        <div className={`mt-8 pt-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className={`mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-900/50 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
            <h4 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              Disclaimer
            </h4>
            <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              The trending topics and data displayed on this website are for informational and visualization purposes only.
              While we strive for accuracy, the data may not be real-time and could contain errors, inaccuracies, or delays.
              This platform aggregates and visualizes trending information from various sources but does not guarantee the
              completeness, reliability, or timeliness of any data presented. Users should independently verify information
              before making any decisions based on the trends shown here. We are not responsible for any actions taken based
              on the information displayed on this site.
            </p>
          </div>
          <div className="text-center text-sm">
            <p>2026 Top Best Charts. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
