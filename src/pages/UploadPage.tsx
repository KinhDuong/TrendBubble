import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import { TrendingTopic } from '../types';
import { supabase } from '../lib/supabase';
import { Upload } from 'lucide-react';

export default function UploadPage() {
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileUpload = async (parsedTopics: TrendingTopic[]): Promise<void> => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setUploadMessage('Please login to upload data');
        setIsLoading(false);
        return;
      }

      const now = new Date().toISOString();
      const existingMap = new Map<string, { id: string; searchVolume: number; index: number }>();
      const seenInCSV = new Map<string, number[]>();

      const { data: existing, error: fetchError } = await supabase
        .from('trending_topics')
        .select('id, name, search_volume')
        .eq('user_id', user.id)
        .eq('source', 'user_upload');

      if (fetchError) {
        console.error('Error fetching existing topics:', fetchError);
      } else if (existing) {
        existing.forEach((topic, idx) => {
          const normalized = topic.name.trim().toLowerCase();
          existingMap.set(normalized, {
            id: topic.id,
            searchVolume: topic.search_volume || 0,
            index: idx,
          });
        });
      }

      let updateCount = 0;
      let insertCount = 0;
      let insertErrors = 0;
      let duplicatesSkipped = 0;

      const normalizedCounts = new Map<string, number>();
      parsedTopics.forEach(t => {
        const normalized = t.name.trim().toLowerCase();
        normalizedCounts.set(normalized, (normalizedCounts.get(normalized) || 0) + 1);
      });

      for (const [index, topic] of parsedTopics.entries()) {
        const normalizedName = topic.name.trim().toLowerCase();

        if (!seenInCSV.has(normalizedName)) {
          seenInCSV.set(normalizedName, [index + 1]);
        } else {
          seenInCSV.get(normalizedName)!.push(index + 1);
          duplicatesSkipped++;
          continue;
        }

        const existing = existingMap.get(normalizedName);

        if (existing) {
          const { error: updateError } = await supabase
            .from('trending_topics')
            .update({
              name: topic.name.trim(),
              search_volume: topic.searchVolume,
              category: topic.category || 'general',
              source: 'user_upload',
              note: topic.note || null,
              value: topic.value || null,
              updated_at: now,
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error(`Error updating topic "${topic.name}":`, updateError);
            insertErrors++;
          } else {
            updateCount++;
          }
        } else {
          const { error: insertError } = await supabase
            .from('trending_topics')
            .insert({
              name: topic.name.trim(),
              search_volume: topic.searchVolume,
              category: topic.category || 'general',
              source: 'user_upload',
              note: topic.note || null,
              value: topic.value || null,
              user_id: user.id,
              created_at: now,
              updated_at: now,
            });

          if (insertError) {
            console.error(`Error inserting topic "${topic.name}":`, insertError);
            insertErrors++;
          } else {
            insertCount++;
          }
        }
      }

      const message = `Upload complete!\nTotal in CSV: ${parsedTopics.length}\nDuplicates in CSV: ${duplicatesSkipped}\nUpdated: ${updateCount}\nInserted: ${insertCount}\nFailed: ${insertErrors}`;
      setUploadMessage(message);

      setTimeout(() => {
        navigate('/trending-now');
      }, 2000);
    } catch (error) {
      console.error('Error saving topics:', error);
      setUploadMessage(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Upload size={40} className="text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Create My Charts</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload your CSV data to create custom visualizations and track your own trends
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">CSV Format Requirements</h2>
            <div className="bg-gray-50 rounded-lg p-6 text-sm text-gray-700 space-y-3">
              <p className="font-medium">Your CSV file should include these columns:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><span className="font-semibold">name</span> - The topic or keyword name (required)</li>
                <li><span className="font-semibold">searchVolume</span> - Search volume as a number (required)</li>
                <li><span className="font-semibold">category</span> - Category name (optional, defaults to "general")</li>
                <li><span className="font-semibold">note</span> - Additional notes (optional)</li>
                <li><span className="font-semibold">value</span> - Numeric value (optional)</li>
              </ul>
              <p className="mt-4 pt-4 border-t border-gray-200">
                <span className="font-semibold">Example:</span> name,searchVolume,category<br />
                <span className="text-gray-500">React,1500000,Technology</span>
              </p>
            </div>
          </div>

          <FileUpload
            onUpload={handleFileUpload}
            theme="light"
            sourceFilter="user_upload"
            sources={['user_upload']}
          />

          {isLoading && (
            <div className="mt-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Processing your upload...</p>
            </div>
          )}

          {uploadMessage && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="text-sm text-gray-700 whitespace-pre-line font-medium">
                    {uploadMessage}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Redirecting to your charts...</p>
                </div>
                <button
                  onClick={() => setUploadMessage(null)}
                  className="text-gray-500 hover:text-gray-900 text-xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Need help? Check out our <a href="/about" className="text-blue-600 hover:text-blue-700 font-medium">About</a> page or <a href="/contact" className="text-blue-600 hover:text-blue-700 font-medium">Contact us</a></p>
        </div>
      </div>
    </div>
  );
}
