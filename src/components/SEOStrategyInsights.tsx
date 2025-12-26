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
    if (!userId) {
      console.log('SEO Strategy: No userId provided, skipping load');
      return;
    }

    console.log(`SEO Strategy: Loading for brand="${brandName}", userId="${userId}"`);

    try {
      // Directly query database for existing strategy (get latest one)
      const { data: existingStrategy, error } = await supabase
        .from('brand_seo_strategy')
        .select('*')
        .eq('brand_name', brandName)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading SEO strategy:', error);
        return;
      }

      console.log('SEO Strategy query result:', existingStrategy ? `Found (${existingStrategy.analysis?.length || 0} chars)` : 'Not found');

      if (existingStrategy) {
        // Fetch keyword data to calculate top50 for display
        const { data: allKeywords } = await supabase
          .from('brand_keyword_data')
          .select('keyword, "Avg. monthly searches", "Three month change", "YoY change", competition, is_branded')
          .eq('brand', brandName);

        let top50Data: any[] = [];
        let totalKeywords = 0;
        let qualifiedKeywords = 0;

        if (allKeywords && allKeywords.length > 0) {
          totalKeywords = allKeywords.length;

          // Filter for Low/Medium competition
          const filteredKeywords = allKeywords.filter(k => {
            const keyword = (k.keyword || '').toLowerCase();
            if (keyword.includes('near me') || keyword.includes('close to me')) {
              return false;
            }
            const comp = k.competition;
            const volume = k['Avg. monthly searches'] || 0;
            if (comp === 'Low' && volume >= 500) return true;
            if (comp === 'Medium' && volume >= 2000) return true;
            return false;
          });

          qualifiedKeywords = filteredKeywords.length;

          // Calculate priority scores
          const scoredKeywords = filteredKeywords.map(k => {
            const volume = k['Avg. monthly searches'] || 0;
            const threeMonthChange = parseFloat(k['Three month change']?.replace('%', '') || '0');
            const yoyChange = parseFloat(k['YoY change']?.replace('%', '') || '0');
            const comp = k.competition;
            const avgGrowth = (threeMonthChange + yoyChange) / 2;
            const growthMultiplier = 1.0 + (avgGrowth / 100);
            const compMultiplier = comp === 'Low' ? 2.5 : 1.0;
            const priorityScore = volume * growthMultiplier * compMultiplier;

            return {
              ...k,
              priorityScore: Math.round(priorityScore)
            };
          });

          // Get top 50
          const top50Keywords = scoredKeywords
            .sort((a, b) => b.priorityScore - a.priorityScore)
            .slice(0, 50);

          top50Data = top50Keywords.map((k, i) => ({
            rank: i + 1,
            keyword: k.keyword,
            volume: k['Avg. monthly searches'] || 0,
            competition: k.competition,
            threeMonthChange: k['Three month change'] || 'N/A',
            yoyChange: k['YoY change'] || 'N/A',
            priorityScore: k.priorityScore,
            isBranded: k.is_branded || false,
          }));
        }

        setStrategy({
          ...existingStrategy,
          top50Keywords: top50Data,
          totalKeywords: totalKeywords,
          qualifiedKeywords: qualifiedKeywords,
        });
      }
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
        body: JSON.stringify({
          brand: brandName,
          forceRegenerate: !!strategy
        }),
      });

      const result = await response.json();
      console.log('SEO Strategy generation result:', result);

      if (!result.success) {
        setErrorCode(result.errorCode || null);
        throw new Error(result.error || 'Failed to generate SEO strategy');
      }

      console.log('Setting strategy data:', result.data);
      setStrategy(result.data);
    } catch (err: any) {
      console.error('Error generating SEO strategy:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Parse text into sections
  const parseAnalysisSections = (text: string) => {
    const sections: { title: string; content: string }[] = [];
    const lines = text.split('\n');
    let currentSection = { title: '', content: '' };

    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (currentSection.title) {
          sections.push(currentSection);
        }
        currentSection = { title: line.substring(3).trim(), content: '' };
      } else {
        currentSection.content += line + '\n';
      }
    }
    if (currentSection.title) {
      sections.push(currentSection);
    }

    return sections;
  };

  // Parse individual keyword analysis from TOP 10 section
  const parseKeywordAnalyses = (content: string) => {
    const analyses: string[] = [];
    const lines = content.split('\n');
    let currentAnalysis = '';

    for (const line of lines) {
      if (line.match(/^### \d+\./)) {
        if (currentAnalysis.trim()) {
          analyses.push(currentAnalysis.trim());
        }
        currentAnalysis = line + '\n';
      } else {
        currentAnalysis += line + '\n';
      }
    }
    if (currentAnalysis.trim()) {
      analyses.push(currentAnalysis.trim());
    }

    return analyses;
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
        } else if (line.trim().match(/^[-]+$/)) {
          // Skip markdown horizontal rules (lines with only dashes)
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
            {console.log('Rendering strategy:', { hasAnalysis: !!strategy.analysis, analysisLength: strategy.analysis?.length })}

            {/* AI Analysis */}
            <div className={`prose max-w-none ${theme === 'dark' ? 'prose-invert' : ''} mb-8`}>
              {(() => {
                const sections = parseAnalysisSections(strategy.analysis);
                console.log('Parsed sections:', sections.length, sections.map(s => s.title));

                return sections.map((section, sectionIdx) => {
                  const isTop10Section = section.title.includes('TOP 10 PRIORITY KEYWORDS') || section.title.includes('TOP 10 KEYWORDS');

                  if (isTop10Section) {
                    const keywordAnalyses = parseKeywordAnalyses(section.content);

                    return (
                      <div key={`section-${sectionIdx}`}>
                        <h2 className={`text-2xl font-bold mt-8 mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {section.title}
                        </h2>
                        <div className="space-y-3">
                          {keywordAnalyses.map((analysis, idx) => {
                            // Extract keyword title from the analysis
                            const titleMatch = analysis.match(/^### (\d+\..+?)$/m);
                            const keywordTitle = titleMatch ? titleMatch[1] : `Keyword ${idx + 1}`;

                            return (
                              <details
                                key={`keyword-${idx}`}
                                className={`group rounded-lg border ${theme === 'dark' ? 'bg-gray-900/30 border-gray-700' : 'bg-white border-gray-200'} overflow-hidden`}
                              >
                                <summary className={`cursor-pointer list-none p-4 font-semibold flex items-center justify-between transition-colors ${
                                  theme === 'dark'
                                    ? 'hover:bg-gray-800/50 text-gray-200'
                                    : 'hover:bg-gray-50 text-gray-900'
                                }`}>
                                  <span className="flex-1">{keywordTitle}</span>
                                  <svg
                                    className="w-5 h-5 transition-transform group-open:rotate-180"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </summary>
                                <div className={`p-4 pt-0 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                                  {renderAnalysis(analysis)}
                                </div>
                              </details>
                            );
                          })}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={`section-${sectionIdx}`}>
                        <h2 className={`text-2xl font-bold mt-8 mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {section.title}
                        </h2>
                        {renderAnalysis(section.content)}
                      </div>
                    );
                  }
                });
              })()}
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
                      {strategy.top50Keywords.slice(0, 10).map((kw) => (
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
                      {strategy.top50Keywords.length > 10 && (
                        <>
                          <tr className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}>
                            <td colSpan={8} className={`border px-3 py-2 text-center font-semibold ${theme === 'dark' ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-600'}`}>
                              Keywords 11-50 (Reference Only - No AI Analysis)
                            </td>
                          </tr>
                          {strategy.top50Keywords.slice(10).map((kw) => (
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
                  <span className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}>Highlighted rows (1-10)</span> have detailed AI analysis above.
                  Keywords 11-50 are qualified opportunities for secondary content planning.
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
