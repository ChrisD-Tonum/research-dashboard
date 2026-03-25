'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Synthesis {
  id: number;
  topic: string;
  format: string;
  outline: any;
  full_text: string;
  generated_at: string;
}

export default function SynthesisPage() {
  const [topic, setTopic] = useState('exercise');
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSynthesis();
  }, [topic]);

  async function fetchSynthesis() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('syntheses')
        .select('*')
        .eq('topic', topic)
        .eq('format', 'educational-page')
        .single();

      if (err && err.code !== 'PGRST116') {
        throw err;
      }

      setSynthesis(data || null);
    } catch (error) {
      console.error('Error fetching synthesis:', error);
      setError('Synthesis not found. Try running the synthesis command first.');
    } finally {
      setLoading(false);
    }
  }

  const renderOutline = (outline: any) => {
    if (!outline) return null;

    if (outline.raw) {
      // Raw text format
      return (
        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap text-gray-700">{outline.raw}</p>
        </div>
      );
    }

    // Structured JSON format
    return (
      <div className="space-y-6">
        {outline.overview && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Overview</h2>
            <p className="text-gray-700">{outline.overview}</p>
          </section>
        )}

        {outline.mechanism && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Mechanism of Action</h2>
            <p className="text-gray-700">{outline.mechanism}</p>
          </section>
        )}

        {outline.findings && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Research Findings</h2>
            {typeof outline.findings === 'object' ? (
              <div className="space-y-3">
                {Object.entries(outline.findings).map(([source, items]: [string, any]) => (
                  <div key={source}>
                    <h3 className="text-lg font-semibold text-gray-800">{source}</h3>
                    {Array.isArray(items) ? (
                      <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                        {items.map((item: string, idx: number) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-700 ml-2">{items}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-700">{outline.findings}</p>
            )}
          </section>
        )}

        {outline.benefits && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Potential Benefits</h2>
            {Array.isArray(outline.benefits) ? (
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                {outline.benefits.map((benefit: string, idx: number) => (
                  <li key={idx}>{benefit}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-700">{outline.benefits}</p>
            )}
          </section>
        )}

        {outline.risks && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Risks and Safety</h2>
            {Array.isArray(outline.risks) ? (
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                {outline.risks.map((risk: string, idx: number) => (
                  <li key={idx}>{risk}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-700">{outline.risks}</p>
            )}
          </section>
        )}

        {outline.legal_status && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Legal Status</h2>
            <p className="text-gray-700">{outline.legal_status}</p>
          </section>
        )}

        {outline.citations && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Citations</h2>
            {Array.isArray(outline.citations) ? (
              <ul className="list-decimal list-inside space-y-2 text-gray-700">
                {outline.citations.map((citation: string, idx: number) => (
                  <li key={idx}>{citation}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-700">{outline.citations}</p>
            )}
          </section>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Research Synthesis</h1>
          <p className="text-gray-600">AI-generated structured research summaries</p>
        </div>

        {/* Navigation */}
        <div className="mb-6 flex gap-4">
          <a
            href="/research"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
          >
            ← Back to Articles
          </a>
        </div>

        {/* Topic Input */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Research Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter topic (e.g., BPC-157, exercise)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow p-8">
          {loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading synthesis...</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
              <p className="font-semibold">No synthesis found</p>
              <p className="text-sm mt-1">{error}</p>
              <p className="text-sm mt-2">
                To generate a synthesis, run:
              </p>
              <code className="block mt-2 bg-yellow-100 p-2 rounded text-xs">
                node scripts/crawl.js --topic "{topic}"<br />
                node scripts/summarize.js --topic "{topic}"<br />
                node scripts/synthesize.js --topic "{topic}"
              </code>
            </div>
          )}

          {synthesis && !loading && (
            <div>
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{topic}</h2>
                <p className="text-sm text-gray-500">
                  Generated: {new Date(synthesis.generated_at).toLocaleDateString()} at {new Date(synthesis.generated_at).toLocaleTimeString()}
                </p>
              </div>

              {renderOutline(synthesis.outline)}

              {synthesis.full_text && !synthesis.outline?.raw && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Full Text</h3>
                  <p className="whitespace-pre-wrap text-gray-700 text-sm">{synthesis.full_text}</p>
                </div>
              )}
            </div>
          )}

          {!synthesis && !loading && !error && (
            <div className="text-center py-12">
              <p className="text-gray-500">No synthesis available yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
