interface FooterProps {
  theme: 'dark' | 'light';
}

export default function Footer({ theme }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-600'} border-t mt-12`}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Google Trending Topics
            </h3>
            <p className="text-sm">
              Track real-time trending topics on Google with interactive visualization. Bubble size represents search volume. Auto-updates hourly.
            </p>
          </div>

          <div>
            <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Features
            </h3>
            <ul className="text-sm space-y-2">
              <li>Interactive bubble chart visualization</li>
              <li>Hourly automatic updates</li>
              <li>Category and date filtering</li>
              <li>List and bubble view modes</li>
            </ul>
          </div>

          <div>
            <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              About
            </h3>
            <p className="text-sm">
              Track what the world is searching for in real-time. Data sourced from Google Trends and updated hourly to keep you informed of the latest trending topics.
            </p>
          </div>
        </div>

        <div className={`mt-8 pt-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} text-center text-sm`}>
          <p>{currentYear} Google Trending Topics. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
