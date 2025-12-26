import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, AlertTriangle, Target } from 'lucide-react';

interface PPCInsights {
  summary: {
    totalKeywords: number;
    transactionalCount: number;
    commercialCount: number;
    localCount: number;
    avgCpcTransactional: string;
    avgCpcCommercial: string;
    totalVolumeTransactional: number;
    totalVolumeCommercial: number;
  };
  recommendations: {
    priorityCampaign: string;
    budgetAllocation: {
      transactional: string;
      commercial: string;
      local: string;
    };
    topTransactionalKeywords: Array<{
      keyword: string;
      cpc: number;
      volume: number;
      competition: string;
      matchedPatterns: string[];
    }>;
    topCommercialKeywords: Array<{
      keyword: string;
      cpc: number;
      volume: number;
      competition: string;
      matchedPatterns: string[];
    }>;
    warnings: string[];
  };
}

interface PPCCampaignInsightsProps {
  brandPageSlug: string;
  brandName: string;
  theme: string;
  userId: string;
  isOwner: boolean;
}

export default function PPCCampaignInsights({
  brandPageSlug,
  brandName,
  theme,
  userId,
  isOwner
}: PPCCampaignInsightsProps) {
  const [insights, setInsights] = useState<PPCInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ppc-campaign-insights`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ brandPageSlug })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PPC insights');
      }

      const data = await response.json();
      setInsights(data);
    } catch (err) {
      console.error('Error fetching PPC insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to load PPC insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [brandPageSlug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto mt-8 px-2 md:px-0">
        <div className={`rounded-lg p-6 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto mt-8 px-2 md:px-0">
        <div className={`rounded-lg p-6 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="text-center text-red-600 py-4">{error}</div>
        </div>
      </div>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto mt-8 px-2 md:px-0">
      <div className={`rounded-lg p-6 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="w-6 h-6 text-green-600" />
          <h2 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            PPC / Google Ads Campaigns (Paid Traffic & ROAS)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-blue-50'}`}>
            <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Transactional Keywords
            </div>
            <div className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {insights.summary.transactionalCount}
            </div>
            <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Avg CPC: ${insights.summary.avgCpcTransactional}
            </div>
          </div>

          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-purple-50'}`}>
            <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Commercial Keywords
            </div>
            <div className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {insights.summary.commercialCount}
            </div>
            <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Avg CPC: ${insights.summary.avgCpcCommercial}
            </div>
          </div>

          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-green-50'}`}>
            <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Total Search Volume
            </div>
            <div className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {(insights.summary.totalVolumeTransactional + insights.summary.totalVolumeCommercial).toLocaleString()}
            </div>
            <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Monthly searches
            </div>
          </div>

          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-orange-50'}`}>
            <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Priority Campaign
            </div>
            <div className={`text-2xl font-bold mt-1 capitalize ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {insights.recommendations.priorityCampaign}
            </div>
            <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Focus here first
            </div>
          </div>
        </div>

        {insights.recommendations.warnings.length > 0 && (
          <div className={`mb-6 p-4 rounded-lg border ${theme === 'dark' ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-800'}`}>
                  Warnings & Considerations
                </h3>
                <ul className={`space-y-1 text-sm ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'}`}>
                  {insights.recommendations.warnings.map((warning, idx) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className={`mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-blue-600" />
            <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Recommended Budget Allocation
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`p-3 rounded ${theme === 'dark' ? 'bg-gray-600' : 'bg-white'}`}>
              <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Transactional
              </div>
              <div className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {insights.recommendations.budgetAllocation.transactional}
              </div>
            </div>
            <div className={`p-3 rounded ${theme === 'dark' ? 'bg-gray-600' : 'bg-white'}`}>
              <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Commercial
              </div>
              <div className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {insights.recommendations.budgetAllocation.commercial}
              </div>
            </div>
            <div className={`p-3 rounded ${theme === 'dark' ? 'bg-gray-600' : 'bg-white'}`}>
              <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Local
              </div>
              <div className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {insights.recommendations.budgetAllocation.local}
              </div>
            </div>
          </div>
        </div>

        {insights.recommendations.topTransactionalKeywords.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Top Transactional Keywords (Ready to Buy)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className={`w-full ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                    <th className={`text-left py-2 px-3 text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Keyword
                    </th>
                    <th className={`text-right py-2 px-3 text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      CPC
                    </th>
                    <th className={`text-right py-2 px-3 text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Volume
                    </th>
                    <th className={`text-center py-2 px-3 text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Competition
                    </th>
                    <th className={`text-left py-2 px-3 text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Intent Signals
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {insights.recommendations.topTransactionalKeywords.map((kw, idx) => (
                    <tr key={idx} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                      <td className="py-2 px-3 text-sm font-medium">{kw.keyword}</td>
                      <td className="py-2 px-3 text-sm text-right">${kw.cpc?.toFixed(2) || 'N/A'}</td>
                      <td className="py-2 px-3 text-sm text-right">{kw.volume?.toLocaleString() || 'N/A'}</td>
                      <td className="py-2 px-3 text-sm text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          kw.competition === 'HIGH'
                            ? 'bg-red-100 text-red-700'
                            : kw.competition === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {kw.competition || 'N/A'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {kw.matchedPatterns?.join(', ') || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {insights.recommendations.topCommercialKeywords.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Top Commercial Keywords (Research Intent)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className={`w-full ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                    <th className={`text-left py-2 px-3 text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Keyword
                    </th>
                    <th className={`text-right py-2 px-3 text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      CPC
                    </th>
                    <th className={`text-right py-2 px-3 text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Volume
                    </th>
                    <th className={`text-center py-2 px-3 text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Competition
                    </th>
                    <th className={`text-left py-2 px-3 text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Intent Signals
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {insights.recommendations.topCommercialKeywords.map((kw, idx) => (
                    <tr key={idx} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                      <td className="py-2 px-3 text-sm font-medium">{kw.keyword}</td>
                      <td className="py-2 px-3 text-sm text-right">${kw.cpc?.toFixed(2) || 'N/A'}</td>
                      <td className="py-2 px-3 text-sm text-right">{kw.volume?.toLocaleString() || 'N/A'}</td>
                      <td className="py-2 px-3 text-sm text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          kw.competition === 'HIGH'
                            ? 'bg-red-100 text-red-700'
                            : kw.competition === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {kw.competition || 'N/A'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {kw.matchedPatterns?.join(', ') || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
