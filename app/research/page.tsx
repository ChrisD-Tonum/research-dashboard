'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { exportToCSV, exportToJSON, exportToPDF } from '@/lib/export';

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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Research Dashboard</h1>
          <p className="text-gray-600">Explore curated research articles</p>
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

        {/* Navigation */}
        <div className="mb-6 flex gap-4">
          <a
            href="/research/synthesis"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            📊 View Synthesis
          </a>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source
              </label>
              <select
                value={filters.source}
                onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keyword
              </label>
              <input
                type="text"
                value={filters.keyword}
                onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                placeholder="Search in titles..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Results ({articles.length})
            </h2>
            {articles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => exportToCSV(articles, topic)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition"
                >
                  📊 Export CSV
                </button>
                <button
                  onClick={() => exportToJSON(articles, topic)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition"
                >
                  📋 Export JSON
                </button>
                <button
                  onClick={() => exportToPDF(articles, topic)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition"
                >
                  📄 Export PDF
                </button>
              </div>
            )}
          </div>
          
          {loading && <p className="text-gray-500">Loading...</p>}
          
          {articles.length === 0 && !loading && (
            <p className="text-gray-500">No articles found. Try a different topic.</p>
          )}
          
          <div className="space-y-4">
            {articles.map((article) => (
              <div key={article.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <h3 className="text-lg font-semibold text-blue-600 hover:underline">
                  <a href={article.url} target="_blank" rel="noopener noreferrer">
                    {article.title}
                  </a>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">{article.source_name}</span> • {new Date(article.crawl_date).toLocaleDateString()}
                </p>
                <p className="text-gray-700 mt-2 line-clamp-3">{article.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
