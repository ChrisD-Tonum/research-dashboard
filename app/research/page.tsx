'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { exportToCSV, exportToJSON, exportToPDF } from '@/lib/export';
import DarkModeToggle from '@/app/components/DarkModeToggle';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import Badge from '@/app/components/Badge';
import { useToast } from '@/app/components/ToastContainer';

interface Article {
  id: number;
  topic: string;
  source_name: string;
  title: string;
  url: string;
  content: string;
  crawl_date: string;
}

type SortOption = 'date-newest' | 'date-oldest' | 'relevance' | 'source';

export default function ResearchPage() {
  const { addToast } = useToast();
  const [topic, setTopic] = useState('exercise');
  const [articles, setArticles] = useState<Article[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('date-newest');
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
      
      let sortedData = data || [];
      sortedData = sortArticles(sortedData, sortBy);
      
      setArticles(sortedData);
    } catch (error) {
      console.error('Error fetching articles:', error);
      addToast('Failed to fetch articles', 'error');
    } finally {
      setLoading(false);
    }
  }

  function sortArticles(articlesData: Article[], sort: SortOption): Article[] {
    const copy = [...articlesData];
    
    switch (sort) {
      case 'date-newest':
        return copy.sort((a, b) => new Date(b.crawl_date).getTime() - new Date(a.crawl_date).getTime());
      case 'date-oldest':
        return copy.sort((a, b) => new Date(a.crawl_date).getTime() - new Date(b.crawl_date).getTime());
      case 'source':
        return copy.sort((a, b) => a.source_name.localeCompare(b.source_name));
      case 'relevance':
      default:
        return copy;
    }
  }

  function handleSortChange(newSort: SortOption) {
    setSortBy(newSort);
    setArticles(sortArticles(articles, newSort));
  }

  function handleClearAllFilters() {
    setFilters({ source: 'all', keyword: '' });
    addToast('Filters cleared', 'info');
  }

  async function handleExportCSV() {
    try {
      await exportToCSV(articles, topic);
      addToast('Exported to CSV successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      addToast('Failed to export CSV', 'error');
    }
  }

  async function handleExportJSON() {
    try {
      await exportToJSON(articles, topic);
      addToast('Exported to JSON successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      addToast('Failed to export JSON', 'error');
    }
  }

  async function handleExportPDF() {
    try {
      await exportToPDF(articles, topic);
      addToast('Exported to PDF successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      addToast('Failed to export PDF', 'error');
    }
  }

  async function copyToClipboard(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      addToast('URL copied to clipboard', 'success');
    } catch (error) {
      console.error('Copy error:', error);
      addToast('Failed to copy URL', 'error');
    }
  }

  const sources = [...new Set(articles.map(a => a.source_name))];
  const activeFilterCount = (filters.source !== 'all' ? 1 : 0) + (filters.keyword ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-8 transition-colors md:ml-0">
      <div className="max-w-6xl mx-auto">
        {/* Header with Gradient & Dark Mode Toggle */}
        <div className="mb-8 flex justify-between items-start pt-10 md:pt-0">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
              Articles
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
            <span>🔍</span> Filters & Sort
          </h2>
          
          {/* Sort and Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-header-primary mb-2">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              >
                <option value="date-newest">📅 Date (Newest)</option>
                <option value="date-oldest">📅 Date (Oldest)</option>
                <option value="source">📰 Source</option>
                <option value="relevance">⭐ Relevance</option>
              </select>
            </div>
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

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {filters.source !== 'all' && (
                <span className="filter-pill">
                  📰 {filters.source}
                  <button
                    onClick={() => setFilters({ ...filters, source: 'all' })}
                    className="filter-pill-close"
                    aria-label={`Remove ${filters.source} filter`}
                  >
                    ✕
                  </button>
                </span>
              )}
              {filters.keyword && (
                <span className="filter-pill">
                  🔎 {filters.keyword}
                  <button
                    onClick={() => setFilters({ ...filters, keyword: '' })}
                    className="filter-pill-close"
                    aria-label="Remove keyword filter"
                  >
                    ✕
                  </button>
                </span>
              )}
              <button
                onClick={handleClearAllFilters}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                Clear All
              </button>
            </div>
          )}
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
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-sm font-medium transition shadow-md hover:shadow-lg"
                >
                  📊 Export CSV
                </button>
                <button
                  onClick={handleExportJSON}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg text-sm font-medium transition shadow-md hover:shadow-lg"
                >
                  📋 Export JSON
                </button>
                <button
                  onClick={handleExportPDF}
                  className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-lg text-sm font-medium transition shadow-md hover:shadow-lg"
                >
                  📄 Export PDF
                </button>
              </div>
            )}
          </div>
          
          {loading && (
            <div className="py-12 text-center">
              <LoadingSpinner size="md" text="Loading articles..." />
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
              <div key={article.id} className="article-item border border-gray-300 dark:border-gray-600 rounded-lg p-5 hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-500 transition-all bg-white dark:bg-gray-800 group">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mb-3">
                      <a href={article.url} target="_blank" rel="noopener noreferrer">
                        {article.title}
                      </a>
                    </h3>
                    
                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge 
                        label={article.source_name} 
                        variant="source" 
                        icon="📰"
                        size="sm"
                      />
                      <Badge 
                        label={new Date(article.crawl_date).toLocaleDateString()} 
                        variant="date" 
                        icon="📅"
                        size="sm"
                      />
                    </div>
                    
                    <p className="text-gray-700 dark:text-gray-300 line-clamp-3 leading-relaxed">{article.content}</p>
                  </div>
                  
                  {/* Copy URL Button */}
                  <button
                    onClick={() => copyToClipboard(article.url)}
                    className="md:opacity-0 md:group-hover:opacity-100 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                    title={article.url}
                    aria-label="Copy article URL"
                  >
                    📋 Copy Link
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
