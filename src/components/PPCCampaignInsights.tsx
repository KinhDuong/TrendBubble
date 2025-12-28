import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, Sparkles, AlertTriangle } from 'lucide-react';

interface PPCInsightsResponse {
  insights_markdown?: string;
  markdown?: string;
  metadata?: {
    id: string;
    created_at: string;
    updated_at: string;
  };
}

interface PPCCampaignInsightsProps {
  brandPageSlug: string;
  brandName: string;
  theme: string;
  userId: string;
  isOwner: boolean;
}

function MarkdownRenderer({ content, theme }: { content: string; theme: string }) {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let currentTable: string[][] = [];
  let inTable = false;
  let listItems: string[] = [];
  let inList = false;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={elements.length} className={`mb-4 space-y-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {listItems.map((item, i) => (
            <li key={i} className="ml-4">
              <span className="mr-2">•</span>
              {item}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
    inList = false;
  };

  const flushTable = () => {
    if (currentTable.length > 0) {
      const headers = currentTable[0];
      const rows = currentTable.slice(2);

      elements.push(
        <div key={elements.length} className="overflow-x-auto mb-6">
          <table className={`w-full border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}>
            <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}>
              <tr>
                {headers.map((header, i) => (
                  <th key={i} className={`px-4 py-2 text-left text-sm font-semibold border ${theme === 'dark' ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'}`}>
                    {header.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={`border-b ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-700/30' : 'border-gray-200 hover:bg-gray-50'}`}>
                  {row.map((cell, j) => (
                    <td key={j} className={`px-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      currentTable = [];
    }
    inTable = false;
  };

  lines.forEach((line, index) => {
    if (line.trim().startsWith('###')) {
      flushList();
      flushTable();
      const text = line.replace(/^###\s*/, '');
      elements.push(
        <h3 key={elements.length} className={`text-2xl font-bold mt-8 mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {text}
        </h3>
      );
    } else if (line.trim().startsWith('####')) {
      flushList();
      flushTable();
      const text = line.replace(/^####\s*/, '');
      elements.push(
        <h4 key={elements.length} className={`text-xl font-semibold mt-6 mb-3 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
          {text}
        </h4>
      );
    } else if (line.trim().startsWith('|')) {
      flushList();
      if (!inTable) {
        inTable = true;
      }
      const cells = line.split('|').filter(cell => cell.trim() !== '');
      if (!line.includes('---')) {
        currentTable.push(cells);
      }
    } else if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
      flushTable();
      inList = true;
      const text = line.replace(/^[-•]\s*/, '').trim();
      if (text) {
        listItems.push(text);
      }
    } else if (line.trim() === '') {
      flushList();
      flushTable();
    } else if (line.trim()) {
      flushList();
      flushTable();
      elements.push(
        <p key={elements.length} className={`mb-3 leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {line}
        </p>
      );
    }
  });

  flushList();
  flushTable();

  return <div>{elements}</div>;
}

export default function PPCCampaignInsights({
  brandPageSlug,
  brandName,
  theme,
  userId,
  isOwner
}: PPCCampaignInsightsProps) {
  const [insights, setInsights] = useState<PPCInsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInsights();
  }, [brandName, userId]);

  const loadInsights = async () => {
    if (!userId || !brandName) return;

    try {
      const { data: brandPage } = await supabase
        .from('brand_pages')
        .select('id')
        .eq('brand', brandName)
        .eq('user_id', userId)
        .maybeSingle();

      if (!brandPage) return;

      const { data: existingInsights } = await supabase
        .from('brand_ppc_insights')
        .select('*')
        .eq('brand_page_id', brandPage.id)
        .maybeSingle();

      if (existingInsights) {
        setInsights({
          markdown: existingInsights.insights?.markdown,
          metadata: {
            id: existingInsights.id,
            created_at: existingInsights.created_at,
            updated_at: existingInsights.updated_at
          }
        });
      }
    } catch (err) {
      console.error('Error loading PPC insights:', err);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('You must be logged in to generate PPC insights');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ppc-campaign-insights`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brandName })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PPC insights');
      }

      const data = await response.json();
      setInsights({
        markdown: data.insights_markdown,
        metadata: data.metadata
      });
    } catch (err) {
      console.error('Error generating PPC insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate PPC insights');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto mt-8 px-2 md:px-0">
      <div className={`rounded-lg p-6 shadow-md ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-green-600" />
            <h2 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              PPC / Google Ads Campaigns (Paid Traffic & ROAS)
            </h2>
          </div>
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
              {loading ? 'Generating...' : insights ? 'Regenerate' : 'Generate'}
            </button>
          )}
        </div>

        {error && (
          <div className={`mb-6 p-4 rounded-lg border ${theme === 'dark' ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
              <p className={`text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Analyzing your keyword data with AI...
            </p>
          </div>
        )}

        {!loading && !insights && !error && (
          <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <p>Click "Generate" to create AI-powered PPC campaign insights for {brandName}.</p>
            <p className="text-sm mt-2">This will analyze your keyword data and provide strategic advertising recommendations.</p>
          </div>
        )}

        {!loading && insights && insights.markdown && (
          <div>
            <MarkdownRenderer content={insights.markdown} theme={theme} />

            {insights.metadata && (
              <p className={`text-sm mt-8 pt-4 border-t ${theme === 'dark' ? 'text-gray-500 border-gray-700' : 'text-gray-500 border-gray-200'}`}>
                Generated on {new Date(insights.metadata.updated_at || insights.metadata.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
