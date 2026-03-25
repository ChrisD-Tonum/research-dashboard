'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Collapsible from '@/app/components/Collapsible';
import DarkModeToggle from '@/app/components/DarkModeToggle';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import Badge from '@/app/components/Badge';
import SearchHistory from '@/app/components/SearchHistory';
import { useToast } from '@/app/components/ToastContainer';
import {
  exportSynthesisToPDF,
  exportSynthesisToJSON,
  exportSynthesisToCSV,
} from '@/lib/synthesisExport';

interface Synthesis {
  id: number;
  topic: string;
  format: string;
  outline: any;
  full_text: string;
  generated_at: string;
}

export default function SynthesisPage() {
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const [topic, setTopic] = useState('');
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);

  // Initialize topic from URL query param on mount
  useEffect(() => {
    const topicParam = searchParams.get('topic');
    if (topicParam) {
      setTopic(topicParam);
    }
  }, [searchParams]);

  // Fetch all available topics on mount
  useEffect(() => {
    async function fetchTopics() {
      try {
        const { data: articles } = await supabase
          .from('articles')
          .select('topic');

        const { data: pages } = await supabase
          .from('web_pages')
          .select('topic');

        const topics = new Set<string>();
        if (articles) {
          articles.forEach(a => topics.add(a.topic));
        }
        if (pages) {
          pages.forEach(p => topics.add(p.topic));
        }

        setAvailableTopics(Array.from(topics).sort());
      } catch (error) {
        console.error('Error fetching topics:', error);
      }
    }

    fetchTopics();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const topicFilterDiv = document.getElementById('topic-filter-dropdown');
      if (topicFilterDiv && !topicFilterDiv.contains(event.target as Node)) {
        setTopicDropdownOpen(false);
      }
    }

    if (topicDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [topicDropdownOpen]);

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
      addToast('Failed to load synthesis', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string, label: string = 'Text') {
    try {
      await navigator.clipboard.writeText(text);
      addToast(`${label} copied to clipboard`, 'success');
    } catch (error) {
      console.error('Copy error:', error);
      addToast('Failed to copy to clipboard', 'error');
    }
  }

  function handleExportPDF() {
    if (!synthesis) return;
    try {
      exportSynthesisToPDF(synthesis);
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      addToast('Failed to export PDF', 'error');
    }
  }

  function handleExportJSON() {
    if (!synthesis) return;
    try {
      exportSynthesisToJSON(synthesis);
      addToast('JSON exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      addToast('Failed to export JSON', 'error');
    }
  }

  function handleExportCSV() {
    if (!synthesis) return;
    try {
      exportSynthesisToCSV(synthesis);
      addToast('CSV exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      addToast('Failed to export CSV', 'error');
    }
  }

  const renderNestedObject = (obj: any) => {
    if (Array.isArray(obj)) {
      return (
        <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-2">
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
              <strong className="text-gray-800 dark:text-gray-200">{key}:</strong>
              <div className="ml-3 mt-1">
                {renderNestedObject(value)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return <span className="text-gray-700 dark:text-gray-300">{String(obj)}</span>;
  };

  const renderOutline = (outline: any) => {
    if (!outline) return null;

    if (outline.raw) {
      // Raw text format
      return (
        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{outline.raw}</p>
        </div>
      );
    }

    // Structured JSON format
    return (
      <div className="space-y-6">
        {outline.overview && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Overview</h2>
            {renderNestedObject(outline.overview)}
          </section>
        )}

        {outline.mechanism && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Mechanism of Action</h2>
            {renderNestedObject(outline.mechanism)}
          </section>
        )}

        {outline.findings && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Research Findings</h2>
            {typeof outline.findings === 'object' ? (
              <div className="space-y-3">
                {Object.entries(outline.findings).map(([source, items]: [string, any]) => (
                  <div key={source}>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{source}</h3>
                    {renderNestedObject(items)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-700 dark:text-gray-300">{outline.findings}</p>
            )}
          </section>
        )}

        {outline.benefits && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Potential Benefits</h2>
            {renderNestedObject(outline.benefits)}
          </section>
        )}

        {outline.risks && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Risks and Safety</h2>
            {renderNestedObject(outline.risks)}
          </section>
        )}

        {outline.legal_status && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Legal Status</h2>
            {renderNestedObject(outline.legal_status)}
          </section>
        )}

        {outline.citations && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Citations</h2>
            {renderNestedObject(outline.citations)}
          </section>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 transition-colors">
      <div className="max-w-4xl mx-auto">
        {/* Header with Gradient & Dark Mode Toggle */}
        <div className="mb-8 flex justify-between items-start pt-10 md:pt-0">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 dark:from-purple-400 dark:via-indigo-400 dark:to-blue-400 bg-clip-text text-transparent mb-2">
              Synthesis
            </h1>
            <p className="text-gray-600 dark:text-gray-300">AI-generated structured research summaries</p>
          </div>
          <DarkModeToggle />
        </div>

        {/* Navigation */}
        <div className="mb-6 flex gap-4">
          <a
            href="/research"
            className="px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 dark:from-slate-700 dark:to-slate-800 dark:hover:from-slate-600 dark:hover:to-slate-700 text-white rounded-lg text-sm font-medium transition shadow-md hover:shadow-lg"
          >
            ← Back to Articles
          </a>
        </div>

        {/* Topic Dropdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6 mb-6 transition-colors relative" id="topic-filter-dropdown">
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Recent Topics
          </label>
          <button
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-left flex justify-between items-center"
            onClick={() => setTopicDropdownOpen(!topicDropdownOpen)}
          >
            <span>{availableTopics.length > 0 ? 'Select a topic...' : 'No topics available'}</span>
            <span className={`text-xs transition-transform ${topicDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {topicDropdownOpen && availableTopics.length > 0 && (
            <div className="absolute top-full left-6 right-6 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 shadow-lg z-10 max-h-64 overflow-y-auto">
              {availableTopics.map(t => (
                <button
                  key={t}
                  onClick={() => {
                    setTopic(t);
                    setTopicDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm transition border-t border-gray-200 dark:border-gray-600 ${
                    topic === t
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Topic Input */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6 mb-6 transition-colors">
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Research Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter search term here"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
          <SearchHistory onSelect={setTopic} currentTopic={topic} />
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-8 transition-colors">
          {loading && (
            <div className="text-center py-12">
              <LoadingSpinner size="md" text="Loading synthesis..." />
            </div>
          )}

          {error && !loading && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4 text-amber-900 dark:text-amber-100">
              <p className="font-semibold">❌ No synthesis found</p>
              <p className="text-sm mt-1">{error}</p>
              <p className="text-sm mt-2">
                To generate a synthesis, run:
              </p>
              <code className="block mt-2 bg-amber-100 dark:bg-amber-900/50 p-2 rounded text-xs text-amber-900 dark:text-amber-100">
                node scripts/crawl.js --topic "{topic}"<br />
                node scripts/summarize.js --topic "{topic}"<br />
                node scripts/synthesize.js --topic "{topic}"
              </code>
            </div>
          )}

          {synthesis && !loading && (
            <div>
              <div className="mb-8 pb-6 border-b border-gray-300 dark:border-gray-600">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{topic}</h2>
                  {/* Export Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleExportPDF}
                      className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-lg text-sm font-medium transition shadow-md hover:shadow-lg"
                      title="Export synthesis as PDF"
                    >
                      📄 PDF
                    </button>
                    <button
                      onClick={handleExportJSON}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg text-sm font-medium transition shadow-md hover:shadow-lg"
                      title="Export synthesis as JSON"
                    >
                      📋 JSON
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-sm font-medium transition shadow-md hover:shadow-lg"
                      title="Export synthesis as CSV"
                    >
                      📊 CSV
                    </button>
                  </div>
                </div>
                
                {/* Metadata Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    label={new Date(synthesis.generated_at).toLocaleDateString()} 
                    variant="date" 
                    icon="📅"
                    size="sm"
                  />
                  <Badge 
                    label={new Date(synthesis.generated_at).toLocaleTimeString()} 
                    variant="default" 
                    icon="⏰"
                    size="sm"
                  />
                  <Badge 
                    label={synthesis.format || 'Structured'} 
                    variant="tag" 
                    icon="📋"
                    size="sm"
                  />
                </div>
              </div>

              {/* Collapsible Sections */}
              <div className="space-y-4">
                {synthesis.outline?.overview && (
                  <Collapsible title="Overview" icon="📋" defaultOpen={true}>
                    <div className="text-gray-700 dark:text-gray-300">
                      {renderNestedObject(synthesis.outline.overview)}
                    </div>
                  </Collapsible>
                )}

                {synthesis.outline?.mechanism && (
                  <Collapsible title="Mechanism of Action" icon="⚙️" defaultOpen={false}>
                    <div className="text-gray-700 dark:text-gray-300">
                      {renderNestedObject(synthesis.outline.mechanism)}
                    </div>
                  </Collapsible>
                )}

                {synthesis.outline?.findings && (
                  <Collapsible title="Research Findings" icon="🔬" defaultOpen={true}>
                    <div className="text-gray-700 dark:text-gray-300">
                      {typeof synthesis.outline.findings === 'object' ? (
                        <div className="space-y-3">
                          {Object.entries(synthesis.outline.findings).map(([source, items]: [string, any]) => (
                            <div key={source}>
                              <h4 className="font-semibold text-gray-900 dark:text-gray-200 mb-2">{source}</h4>
                              <div className="ml-3">
                                {renderNestedObject(items)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        renderNestedObject(synthesis.outline.findings)
                      )}
                    </div>
                  </Collapsible>
                )}

                {synthesis.outline?.benefits && (
                  <Collapsible title="Potential Benefits" icon="✅" defaultOpen={true}>
                    <div className="text-gray-700 dark:text-gray-300">
                      {renderNestedObject(synthesis.outline.benefits)}
                    </div>
                  </Collapsible>
                )}

                {synthesis.outline?.risks && (
                  <Collapsible title="Risks and Safety" icon="⚠️" defaultOpen={false}>
                    <div className="text-gray-700 dark:text-gray-300">
                      {renderNestedObject(synthesis.outline.risks)}
                    </div>
                  </Collapsible>
                )}

                {synthesis.outline?.legal_status && (
                  <Collapsible title="Legal Status" icon="⚖️" defaultOpen={false}>
                    <div className="text-gray-700 dark:text-gray-300">
                      {renderNestedObject(synthesis.outline.legal_status)}
                    </div>
                  </Collapsible>
                )}

                {synthesis.outline?.citations && (
                  <Collapsible title="Citations" icon="📚" defaultOpen={false}>
                    <div className="text-gray-700 dark:text-gray-300">
                      {renderNestedObject(synthesis.outline.citations)}
                    </div>
                  </Collapsible>
                )}
              </div>

              {synthesis.full_text && !synthesis.outline?.raw && (
                <div className="mt-8 pt-8 border-t border-gray-300 dark:border-gray-600">
                  <Collapsible title="Full Text" icon="📖" defaultOpen={false}>
                    <div className="space-y-3">
                      <button
                        onClick={() => copyToClipboard(synthesis.full_text, 'Full text')}
                        className="mb-4 px-3 py-2 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        📋 Copy Full Text
                      </button>
                      <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{synthesis.full_text}</p>
                    </div>
                  </Collapsible>
                </div>
              )}
            </div>
          )}

          {!synthesis && !loading && !error && (
            <div className="text-center py-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-2xl mb-3">📭 No synthesis available yet</p>
              <p className="text-gray-600 dark:text-gray-300">
                Generate a synthesis by running the scripts above
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
