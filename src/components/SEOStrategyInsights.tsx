import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Eye, AlertCircle } from 'lucide-react';

interface SEOStrategyInsightsProps {
  brandName: string;
  theme: 'dark' | 'light';
  userId: string | undefined;
  isOwner: boolean;
}

interface SEOStrategy {
  id: string;
  brand_name: string;
  user_id: string;
  prompt: string;
  analysis: string;
  created_at: string;
  updated_at: string;
  top50Keywords?: Array<{
    rank: number;
    keyword: string;
    volume: number;
    competition: string;
    threeMonthChange: string;
    yoyChange: string;
    priorityScore: number;
    isBranded: boolean;
  }>;
  totalKeywords?: number;
  qualifiedKeywords?: number;
}

export default function SEOStrategyInsights({ brandName, theme, userId, isOwner }: SEOStrategyInsightsProps) {
  const [strategy, setStrategy] = useState<SEOStrategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // Load existing strategy on mount
  useEffect(() => {
    loadStrategy();
  }, [brandName, userId]);

  const loadStrategy = async () => {
    if (!userId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('brand_seo_strategy')
        .select('*')
        .eq('brand_name', brandName)
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setStrategy(data);
    } catch (err: any) {
      console.error('Error loading SEO strategy:', err);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-seo-strategy`;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('You must be logged in to generate SEO strategy');
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brand: brandName }),
      });

      const result = await response.json();

      if (!result.success) {
        setErrorCode(result.errorCode || null);
        throw new Error(result.error || 'Failed to generate SEO strategy');
      }

      setStrategy(result.data);
    } catch (err: any) {
      console.error('Error generating SEO strategy:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render markdown-like content
  const renderAnalysis = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Table detection
      if (line.includes('|') && line.trim().startsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableHeaders = line.split('|').map(h => h.trim()).filter(h => h);
          // Skip separator line
          if (i + 1 < lines.length && lines[i + 1].includes('---')) {
            i++;
          }
        } else {
          const row = line.split('|').map(c => c.trim()).filter(c => c);
          if (row.length > 0 && !row.every(c => c.match(/^[-:]+$/))) {
            tableRows.push(row);
          }
        }
      } else {
        // End of table
        if (inTable) {
          elements.push(
            <div key={`table-${elements.length}`} className="overflow-x-auto my-4">
              <table className={`min-w-full border-collapse ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}>
                  <tr>
                    {tableHeaders.map((header, idx) => (
                      <th key={idx} className={`border px-4 py-2 text-left font-semibold ${theme === 'dark' ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'}`}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className={theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className={`border px-4 py-2 ${theme === 'dark' ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          inTable = false;
          tableHeaders = [];
          tableRows = [];
        }

        // Headings
        if (line.startsWith('### ')) {
          elements.push(
            <h3 key={`h3-${elements.length}`} className={`text-xl font-bold mt-6 mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {line.substring(4)}
            </h3>
          );
        } else if (line.startsWith('#### ')) {
          elements.push(
            <h4 key={`h4-${elements.length}`} className={`text-lg font-semibold mt-4 mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              {line.substring(5)}
            </h4>
          );
        } else if (line.startsWith('**') && line.endsWith('**')) {
          elements.push(
            <p key={`bold-${elements.length}`} className={`font-semibold my-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              {line.substring(2, line.length - 2)}
            </p>
          );
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          elements.push(
            <li key={`li-${elements.length}`} className={`ml-6 my-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {line.substring(2)}
            </li>
          );
        } else if (line.trim() === '') {
          // Skip empty lines between elements
        } else {
          elements.push(
            <p key={`p-${elements.length}`} className={`my-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              {line}
            </p>
          );
        }
      }
    }

    // Close any remaining table
    if (inTable && tableRows.length > 0) {
      elements.push(
        <div key={`table-${elements.length}`} className="overflow-x-auto my-4">
          <table className={`min-w-full border-collapse ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}>
              <tr>
                {tableHeaders.map((header, idx) => (
                  <th key={idx} className={`border px-4 py-2 text-left font-semibold ${theme === 'dark' ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'}`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, rowIdx) => (
                <tr key={rowIdx} className={theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className={`border px-4 py-2 ${theme === 'dark' ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return elements;
  };

  return (
    <div className="max-w-7xl mx-auto mt-8 px-2 md:px-0">
      <div className={`rounded-lg p-6 shadow-md ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            SEO & Content Strategy Insights
          </h2>
          <div className="flex items-center gap-3">
            {strategy && (
              <button
                onClick={() => setShowPrompt(!showPrompt)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                <Eye className="w-4 h-4" />
                {showPrompt ? 'Hide' : 'Show'} Prompt
              </button>
            )}
            {isOwner && (
              <button
                onClick={handleGenerate}
                disabled={loading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105 ${
                  loading
                    ? theme === 'dark'
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : theme === 'dark'
                      ? 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg'
                      : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-md'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                {loading ? 'Generating...' : strategy ? 'Regenerate' : 'Generate'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className={`mb-4 p-4 rounded-lg border ${theme === 'dark' ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
              <div className="flex-1">
                <p className={`font-semibold mb-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-700'}`}>
                  {errorCode === 'MISSING_API_KEY' ? 'API Key Not Configured' : 'Generation Failed'}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-600'}`}>{error}</p>

                {errorCode === 'MISSING_API_KEY' && (
                  <div className={`mt-3 p-3 rounded-md text-sm ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white'}`}>
                    <p className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Setup Instructions:</p>
                    <ol className={`list-decimal ml-5 space-y-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      <li className="pl-2">Get an API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">platform.openai.com/api-keys</a></li>
                      <li className="pl-2">Go to your Supabase Dashboard → Project Settings → Edge Functions</li>
                      <li className="pl-2">Add environment variable: <code className={`px-1 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>OPENAI_API_KEY</code></li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showPrompt && strategy && (
          <div className={`mb-4 p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-300'}`}>
            <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>Prompt Used:</h3>
            <pre className={`text-sm whitespace-pre-wrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {strategy.prompt}
            </pre>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && !strategy && !error && (
          <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <p>Click "Generate" to create SEO & Content Strategy insights for {brandName}.</p>
            <p className="text-sm mt-2">This will analyze your keyword data and provide actionable recommendations.</p>
          </div>
        )}

        {!loading && strategy && (
          <div className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            {/* Dataset Overview */}
            {strategy.totalKeywords !== undefined && strategy.qualifiedKeywords !== undefined && (
              <div className={`mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-900/50 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Dataset Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Keywords Analyzed</p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {strategy.totalKeywords.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Qualified Opportunities</p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                      {strategy.qualifiedKeywords.toLocaleString()}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      Low/Medium competition with sufficient traffic
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>AI-Analyzed Keywords</p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                      20
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      Top priority with detailed strategy
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Analysis */}
            <div className={`prose max-w-none ${theme === 'dark' ? 'prose-invert' : ''} mb-8`}>
              {renderAnalysis(strategy.analysis)}
            </div>

            {/* Top 50 Keywords Table */}
            {strategy.top50Keywords && strategy.top50Keywords.length > 0 && (
              <div className="mt-8 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Full Top 50 Keyword Reference
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    All qualified keywords (Low/Medium competition)
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className={`min-w-full border-collapse text-sm ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}>
                      <tr>
                        <th className={`border px-3 py-2 text-left font-semibold ${theme === 'dark' ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'}`}>
                          Rank
                        </th>
                        <th className={`border px-3 py-2 text-left font-semibold ${theme === 'dark' ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'}`}>
                          Keyword
                        </th>
                        <th className={`border px-3 py-2 text-right font-semibold ${theme === 'dark' ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'}`}>
                          Volume
                        </th>
                        <th className={`border px-3 py-2 text-center font-semibold ${theme === 'dark' ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'}`}>
                          Competition
                        </th>
                        <th className={`border px-3 py-2 text-right font-semibold ${theme === 'dark' ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'}`}>
                          3-Mo Change
                        </th>
                        <th className={`border px-3 py-2 text-right font-semibold ${theme === 'dark' ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'}`}>
                          YoY Change
                        </th>
                        <th className={`border px-3 py-2 text-center font-semibold ${theme === 'dark' ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'}`}>
                          Type
                        </th>
                        <th className={`border px-3 py-2 text-right font-semibold ${theme === 'dark' ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'}`}>
                          Priority Score
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {strategy.top50Keywords.slice(0, 20).map((kw) => (
                        <tr key={kw.rank} className={`${theme === 'dark' ? 'bg-blue-900/20 hover:bg-blue-900/30' : 'bg-blue-50 hover:bg-blue-100'}`}>
                          <td className={`border px-3 py-2 font-semibold ${theme === 'dark' ? 'border-gray-600 text-blue-400' : 'border-gray-300 text-blue-600'}`}>
                            {kw.rank}
                          </td>
                          <td className={`border px-3 py-2 ${theme === 'dark' ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-800'}`}>
                            {kw.keyword}
                          </td>
                          <td className={`border px-3 py-2 text-right ${theme === 'dark' ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                            {kw.volume.toLocaleString()}
                          </td>
                          <td className={`border px-3 py-2 text-center ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                              kw.competition === 'Low'
                                ? theme === 'dark' ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'
                                : theme === 'dark' ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {kw.competition}
                            </span>
                          </td>
                          <td className={`border px-3 py-2 text-right ${theme === 'dark' ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                            {kw.threeMonthChange}
                          </td>
                          <td className={`border px-3 py-2 text-right ${theme === 'dark' ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                            {kw.yoyChange}
                          </td>
                          <td className={`border px-3 py-2 text-center ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}>
                            <span className={`text-xs ${kw.isBranded ? theme === 'dark' ? 'text-purple-400' : 'text-purple-600' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {kw.isBranded ? 'Branded' : 'Non-Branded'}
                            </span>
                          </td>
                          <td className={`border px-3 py-2 text-right font-semibold ${theme === 'dark' ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-800'}`}>
                            {kw.priorityScore.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {strategy.top50Keywords.length > 20 && (
                        <>
                          <tr className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}>
                            <td colSpan={8} className={`border px-3 py-2 text-center font-semibold ${theme === 'dark' ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-600'}`}>
                              Keywords 21-50 (Reference Only - No AI Analysis)
                            </td>
                          </tr>
                          {strategy.top50Keywords.slice(20).map((kw) => (
                            <tr key={kw.rank} className={theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                              <td className={`border px-3 py-2 ${theme === 'dark' ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-600'}`}>
                                {kw.rank}
                              </td>
                              <td className={`border px-3 py-2 ${theme === 'dark' ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                                {kw.keyword}
                              </td>
                              <td className={`border px-3 py-2 text-right ${theme === 'dark' ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                                {kw.volume.toLocaleString()}
                              </td>
                              <td className={`border px-3 py-2 text-center ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}>
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                  kw.competition === 'Low'
                                    ? theme === 'dark' ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'
                                    : theme === 'dark' ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {kw.competition}
                                </span>
                              </td>
                              <td className={`border px-3 py-2 text-right ${theme === 'dark' ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                                {kw.threeMonthChange}
                              </td>
                              <td className={`border px-3 py-2 text-right ${theme === 'dark' ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                                {kw.yoyChange}
                              </td>
                              <td className={`border px-3 py-2 text-center ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}>
                                <span className={`text-xs ${kw.isBranded ? theme === 'dark' ? 'text-purple-400' : 'text-purple-600' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {kw.isBranded ? 'Branded' : 'Non-Branded'}
                                </span>
                              </td>
                              <td className={`border px-3 py-2 text-right ${theme === 'dark' ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                                {kw.priorityScore.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className={`text-xs mt-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  <span className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}>Highlighted rows (1-20)</span> have detailed AI analysis above.
                  Keywords 21-50 are qualified opportunities for secondary content planning.
                </p>
              </div>
            )}

            <p className={`text-sm mt-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              Generated on {new Date(strategy.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
