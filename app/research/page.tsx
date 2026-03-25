'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { exportToCSV, exportToJSON, exportToPDF } from '@/lib/export';
import DarkModeToggle from '@/app/components/DarkModeToggle';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import Badge from '@/app/components/Badge';
import SearchHistory from '@/app/components/SearchHistory';
import StatsDashboard from '@/app/components/StatsDashboard';
import { useToast } from '@/app/components/ToastContainer';

interface Article {
  id: number;
  topic: string;
  source_name: string;
  title: string;
  url: string;
  content: string;
  crawl_date: string;
  type: 'article'; // Distinguish from web_pages
}

interface WebPage {
  id: number;
  topic: string;
  page_type: 'landing' | 'reference' | 'documentation' | 'data';
  source_name: string;
  url: string;
  title: string;
  content: string;
  structured_data: Record<string, any> | null;
  crawl_date: string;
  type: 'page'; // Distinguish from articles
}

type ContentItem = Article | WebPage;
type SortOption = 'date-newest' | 'date-oldest' | 'relevance' | 'source';
type ContentTypeFilter = 'all' | 'articles' | 'pages';

export default function ResearchPage() {
  const { addToast } = useToast();
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('date-newest');
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('all');
  const [filters, setFilters] = useState({
    source: 'all',
    keyword: '',
  });
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetchContent();
    // Auto-save topic to history
    if (topic.trim()) {
      const stored = localStorage.getItem('researchHistory');
      let history = [];
      if (stored) {
        try {
          history = JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse search history:', e);
        }
      }
      const filtered = history.filter((item: any) => item.topic.toLowerCase() !== topic.toLowerCase());
      const updated = [{ topic, timestamp: Date.now() }, ...filtered];
      const limited = updated.slice(0, 10);
      localStorage.setItem('researchHistory', JSON.stringify(limited));
    }
  }, [topic, filters, contentTypeFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const sourceFilterDiv = document.getElementById('source-filter-dropdown');
      if (sourceFilterDiv && !sourceFilterDiv.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [dropdownOpen]);

  async function fetchContent() {
    setLoading(true);
    try {
      let allContent: ContentItem[] = [];

      // ALWAYS fetch both articles and pages (regardless of filter) so we can calculate accurate counts
      // Fetch articles
      let articleQuery = supabase
        .from('articles')
        .select('*')
        .eq('topic', topic);

      if (filters.source !== 'all') {
        articleQuery = articleQuery.eq('source_name', filters.source);
      }

      if (filters.keyword) {
        articleQuery = articleQuery.ilike('title', `%${filters.keyword}%`);
      }

      const { data: articleData, error: articleError } = await articleQuery;
      if (articleError) throw articleError;

      if (articleData) {
        allContent = allContent.concat(
          articleData.map(a => ({
            ...a,
            type: 'article' as const,
          }))
        );
      }

      // Fetch web pages
      let pageQuery = supabase
        .from('web_pages')
        .select('*')
        .eq('topic', topic);

      if (filters.source !== 'all') {
        pageQuery = pageQuery.eq('source_name', filters.source);
      }

      if (filters.keyword) {
        pageQuery = pageQuery.ilike('title', `%${filters.keyword}%`);
      }

      const { data: pageData, error: pageError } = await pageQuery;
      if (pageError) throw pageError;

      if (pageData) {
        allContent = allContent.concat(
          pageData.map(p => ({
            ...p,
            type: 'page' as const,
          }))
        );
      }

      let sortedData = sortContent(allContent, sortBy);
      setContent(sortedData);
    } catch (error) {
      console.error('Error fetching content:', error);
      addToast('Failed to fetch content', 'error');
    } finally {
      setLoading(false);
    }
  }

  function sortContent(contentData: ContentItem[], sort: SortOption): ContentItem[] {
    const copy = [...contentData];

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
    setContent(sortContent(content, newSort));
  }

  function handleClearAllFilters() {
    setFilters({ source: 'all', keyword: '' });
    setContentTypeFilter('all');
    addToast('Filters cleared', 'info');
  }

  async function handleExportCSV() {
    try {
      // Convert content items to articles format for export compatibility
      const exportData = content.map(item => ({
        ...item,
        type: item.type,
      }));
      await exportToCSV(exportData as any, topic);
      addToast('Exported to CSV successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      addToast('Failed to export CSV', 'error');
    }
  }

  async function handleExportJSON() {
    try {
      const exportData = {
        topic,
        exportedAt: new Date().toISOString(),
        items: content,
        stats: {
          totalItems: content.length,
          articles: content.filter(c => c.type === 'article').length,
          pages: content.filter(c => c.type === 'page').length,
        },
      };
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-${topic}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('Exported to JSON successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      addToast('Failed to export JSON', 'error');
    }
  }

  async function handleExportPDF() {
    try {
      // Simple PDF export (requires jsPDF)
      addToast('PDF export coming soon', 'info');
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

  const sources = [...new Set(content.map(c => c.source_name))];
  const activeFilterCount = 
    (filters.source !== 'all' ? 1 : 0) + 
    (filters.keyword ? 1 : 0) + 
    (contentTypeFilter !== 'all' ? 1 : 0);

  // Calculate total counts for each type (not filtered by active tab)
  const totalArticles = content.filter(c => c.type === 'article').length;
  const totalPages = content.filter(c => c.type === 'page').length;

  // Filter displayed content based on active tab (for rendering only)
  const displayedContent = contentTypeFilter === 'all' 
    ? content 
    : contentTypeFilter === 'articles' 
      ? content.filter(c => c.type === 'article')
      : content.filter(c => c.type === 'page');

  const articles = content.filter(c => c.type === 'article') as Article[];
  const pages = content.filter(c => c.type === 'page') as WebPage[];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-8 transition-colors md:ml-0">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start pt-10 md:pt-0">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
              Research Content
            </h1>
            <p className="text-gray-600 dark:text-gray-300">Articles & Reference Pages</p>
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
            placeholder="Enter search term here"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
          <SearchHistory onSelect={setTopic} currentTopic={topic} />
        </div>

        {/* Navigation & Stats */}
        <div className="mb-6 flex gap-4">
          <a
            href="/research/synthesis"
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg text-sm font-medium transition shadow-md hover:shadow-lg"
          >
            📊 View Synthesis
          </a>
        </div>

        {/* Stats Dashboard */}
        <StatsDashboard articles={articles} loading={loading} />

        {/* Content Type Filter */}
        <div className="card-base p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Content Type</h3>
          <div className="flex gap-2">
            {(['all', 'articles', 'pages'] as const).map(type => {
              const displayCount = type === 'all' ? (totalArticles + totalPages) : (type === 'articles' ? totalArticles : totalPages);
              return (
                <button
                  key={type}
                  onClick={() => setContentTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    contentTypeFilter === type
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {type === 'all' && `📋 All (${displayCount})`}
                  {type === 'articles' && `📄 Articles (${displayCount})`}
                  {type === 'pages' && `🌐 Pages (${displayCount})`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters & Sort */}
        <div className="card-base p-6 mb-6">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-64 relative" id="source-filter-dropdown">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Source
              </label>
              <button
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-left flex justify-between items-center"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span>{filters.source === 'all' ? 'All Sources' : filters.source}</span>
                <span className={`text-xs transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 shadow-lg z-10 min-w-64">
                  <button
                    onClick={() => {
                      setFilters({ ...filters, source: 'all' });
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm transition ${
                      filters.source === 'all'
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    All Sources
                  </button>
                  {sources.length > 0 && sources.map(source => (
                    <button
                      key={source}
                      onClick={() => {
                        setFilters({ ...filters, source });
                        setDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm transition border-t border-gray-200 dark:border-gray-600 ${
                        filters.source === source
                          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                          : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      {source}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search by Title
              </label>
              <input
                type="text"
                value={filters.keyword}
                onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                placeholder="Search title..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              >
                <option value="date-newest">Newest First</option>
                <option value="date-oldest">Oldest First</option>
                <option value="source">Source</option>
                <option value="relevance">Relevance</option>
              </select>
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={handleClearAllFilters}
                className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition text-sm font-medium"
              >
                Clear Filters ({activeFilterCount})
              </button>
            )}
          </div>
        </div>

        {/* Export Buttons */}
        <div className="card-base p-6 mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition shadow-md hover:shadow-lg"
            >
              📊 Export CSV
            </button>
            <button
              onClick={handleExportJSON}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-md hover:shadow-lg"
            >
              📄 Export JSON
            </button>
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition shadow-md hover:shadow-lg"
            >
              📕 Export PDF
            </button>
          </div>
        </div>

        {/* Content List */}
        {loading ? (
          <LoadingSpinner />
        ) : content.length === 0 ? (
          <div className="card-base p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No content found for "{topic}"
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Try a different topic or run the crawlers first
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedContent.map((item, index) => (
              <div
                key={`${item.type}-${item.id}-${index}`}
                className="card-base card-hover p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {item.type === 'article' ? (
                        <Badge label="Article" variant="source" />
                      ) : (
                        <Badge label={`Page: ${(item as WebPage).page_type}`} variant="tag" />
                      )}
                      <Badge label={item.source_name} variant="default" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(item.crawl_date).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 break-words">
                      {item.title || 'Untitled'}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 line-clamp-3 mb-3">
                      {item.content?.substring(0, 200)}...
                    </p>

                    {/* Show structured data if available */}
                    {item.type === 'page' && (item as WebPage).structured_data && (
                      <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Structured Data:
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {Object.keys((item as WebPage).structured_data || {}).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition"
                    >
                      View
                    </a>
                    <button
                      onClick={() => copyToClipboard(item.url)}
                      className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 text-sm font-medium rounded-lg transition"
                      title="Copy URL"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
