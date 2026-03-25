'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { exportToCSV, exportToJSON, exportToPDF } from '@/lib/export';
import DarkModeToggle from '@/app/components/DarkModeToggle';

interface Article {
  id: number;
  topic: string;
  source_name: string;
  title: string;
  url: string;
  content: string;
  crawl_date: string;
}

export default function ResearchPage() {
  const [topic, setTopic] = useState('exercise');
  const [articles, setArticles] = useState<Article[]>([]);
  const [filters, setFilters] = useState({
    source: 'all',
    keyword: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, [topic, filters]);

  async function fetchArticles() {
    setLoading(true);
    try {
      let query = supabase
        .from('articles')
        .select('*')
        .eq('topic', topic);

      if (filters.source !== 'all') {
        query = query.eq('source_name', filters.source);
      }

      if (filters.keyword) {
        query = query.ilike('title', `%${filters.keyword}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  }

  const sources = [...new Set(articles.map(a => a.source_name))];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 transition-colors">
      <div className="max-w-6xl mx-auto">
        {/* Header with Gradient & Dark Mode Toggle */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
              Research Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300">Explore curated research articles</p>
          </div>
          <DarkModeToggle />
        </div>

        {/* Topic Input */}
        <div className="card-base card-hover p-6 mb-6">
          <label className="block text-sm font-medium text-header-primary mb-2">
            Research Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter topic (e.g., BPC-157, exercise)"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        {/* Navigation */}
        <div className="mb-6 flex gap-4">
          <a
            href="/research/synthesis"
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg text-sm font-medium transition shadow-md hover:shadow-lg"
          >
            📊 View Synthesis
          </a>
        </div>

        {/* Filters Section */}
        <div className="card-base card-hover p-6 mb-6">
          <h2 className="text-lg font-semibold text-header-primary mb-4 flex items-center gap-2">
            <span>🔍</span> Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-header-primary mb-2">
                Source
              </label>
              <select
                value={filters.source}
                onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              >
                <option value="all">All sources</option>
                {sources.map(source => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-header-primary mb-2">
                Keyword
              </label>
              <input
                type="text"
                value={filters.keyword}
                onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                placeholder="Search in titles..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="card-base card-hover p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-lg font-semibold text-header-primary flex items-center gap-2">
              <span>📄</span> Results ({articles.length})
            </h2>
            {articles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => exportToCSV(articles, topic)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-sm font-medium transition shadow-md hover:shadow-lg"
                >
                  📊 Export CSV
                </button>
                <button
                  onClick={() => exportToJSON(articles, topic)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg text-sm font-medium transition shadow-md hover:shadow-lg"
                >
                  📋 Export JSON
                </button>
                <button
                  onClick={() => exportToPDF(articles, topic)}
                  className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-lg text-sm font-medium transition shadow-md hover:shadow-lg"
                >
                  📄 Export PDF
                </button>
              </div>
            )}
          </div>
          
          {loading && (
            <div className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 animate-pulse">⏳ Loading articles...</p>
            </div>
          )}
          
          {articles.length === 0 && !loading && (
            <div className="py-12 text-center bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-2xl mb-3">🔍 No articles found</p>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Try searching for a different topic or adjusting your filters.
              </p>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p className="mb-2">💡 Suggestions:</p>
                <ul className="space-y-1">
                  <li>• Try topics like "BPC-157", "exercise", or "sleep"</li>
                  <li>• Clear filters to see all available articles</li>
                  <li>• Check that articles have been crawled for this topic</li>
                </ul>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {articles.map((article) => (
              <div key={article.id} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-500 transition-all bg-white dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  <a href={article.url} target="_blank" rel="noopener noreferrer">
                    {article.title}
                  </a>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <span className="font-medium">{article.source_name}</span> • {new Date(article.crawl_date).toLocaleDateString()}
                </p>
                <p className="text-gray-700 dark:text-gray-300 mt-2 line-clamp-3">{article.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
