'use client';

import React, { useState, useEffect } from 'react';
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
        .order('generated_at', { ascending: false })
        .limit(1);

      if (err) {
        console.error('Supabase error:', err);
        throw err;
      }

      if (data && data.length > 0) {
        console.log('Synthesis data:', JSON.stringify(data[0], null, 2));
        setSynthesis(data[0]);
      } else {
        setSynthesis(null);
        setError('Synthesis not found. Try running the synthesis command first.');
      }
    } catch (error) {
      console.error('Error fetching synthesis:', error);
      setError('Error loading synthesis. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const renderNestedObject = (obj: any): JSX.Element => {
    if (Array.isArray(obj)) {
      return (
        <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
          {obj.map((item: any, idx: number) => (
            <li key={idx}>{String(item)}</li>
          ))}
        </ul>
      );
    }

    if (typeof obj === 'object' && obj !== null) {
      return (
        <div className="ml-4 space-y-2 text-sm">
          {Object.entries(obj).map(([key, value]: [string, any]) => (
            <div key={key}>
              <strong className="text-gray-800">{key}:</strong>
              <div className="ml-3 mt-1">
                {renderNestedObject(value)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return <span className="text-gray-700">{String(obj)}</span>;
  };

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
            {renderNestedObject(outline.overview)}
          </section>
        )}

        {outline.mechanism && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Mechanism of Action</h2>
            {renderNestedObject(outline.mechanism)}
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
                    {renderNestedObject(items)}
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
            {renderNestedObject(outline.benefits)}
          </section>
        )}

        {outline.risks && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Risks and Safety</h2>
            {renderNestedObject(outline.risks)}
          </section>
        )}

        {outline.legal_status && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Legal Status</h2>
            {renderNestedObject(outline.legal_status)}
          </section>
        )}

        {outline.citations && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Citations</h2>
            {renderNestedObject(outline.citations)}
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
