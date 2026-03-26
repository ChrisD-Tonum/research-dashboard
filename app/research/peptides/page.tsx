'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import DarkModeToggle from '@/app/components/DarkModeToggle';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import Badge from '@/app/components/Badge';
import { useToast } from '@/app/components/ToastContainer';

interface PeptideRawData {
  id: number;
  source_name: string;
  source_url: string;
  page_url: string;
  page_title: string;
  raw_html: string | null;
  raw_markdown: string | null;
  metadata: Record<string, any>;
  content_hash: string;
  crawl_timestamp: string;
  batch_id: string;
}

interface CrawlStats {
  source_name: string;
  total_pages: number;
  crawl_batches: number;
  last_crawl: string;
  pages_with_markdown: number;
  errors_no_html: number;
}

type SortOption = 'date-newest' | 'date-oldest' | 'title-asc' | 'title-desc' | 'source';

export default function PeptidesResearchPage() {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [pages, setPages] = useState<PeptideRawData[]>([]);
  const [stats, setStats] = useState<CrawlStats[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-newest');
  const [activeTab, setActiveTab] = useState<'overview' | 'raw-data' | 'full-content'>('overview');
  const [selectedPage, setSelectedPage] = useState<PeptideRawData | null>(null);
  const [sources, setSources] = useState<string[]>([]);

  // Fetch stats and pages from Supabase
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      // Fetch stats view
      const { data: statsData, error: statsError } = await supabase
        .from('peptide_crawl_stats')
        .select('*');

      if (statsError) {
        if (statsError.message.includes('does not exist')) {
          addToast('Peptide data table not initialized. Run the migration first.', 'error');
          setIsLoading(false);
          return;
        }
        throw statsError;
      }

      setStats(statsData || []);

      // Extract source names from stats
      const sourceNames = Array.from(new Set((statsData || []).map(s => s.source_name)));
      setSources(sourceNames);

      // Fetch raw data
      const { data: pagesData, error: pagesError } = await supabase
        .from('peptide_raw_data')
        .select('*')
        .order('crawl_timestamp', { ascending: false });

      if (pagesError) {
        throw pagesError;
      }

      setPages(pagesData || []);
    } catch (error: any) {
      console.error('Error fetching peptide data:', error);
      addToast(`Error loading peptide data: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  // Filter and sort pages
  function getFilteredPages() {
    let filtered = pages;

    // Filter by source
    if (selectedSource !== 'all') {
      filtered = filtered.filter(p => p.source_name === selectedSource);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.page_title?.toLowerCase().includes(query) ||
        p.page_url?.toLowerCase().includes(query) ||
        p.raw_markdown?.toLowerCase().includes(query)
      );
    }

    // Sort
    const sorted = [...filtered];
    switch (sortBy) {
      case 'date-newest':
        sorted.sort((a, b) => new Date(b.crawl_timestamp).getTime() - new Date(a.crawl_timestamp).getTime());
        break;
      case 'date-oldest':
        sorted.sort((a, b) => new Date(a.crawl_timestamp).getTime() - new Date(b.crawl_timestamp).getTime());
        break;
      case 'title-asc':
        sorted.sort((a, b) => (a.page_title || '').localeCompare(b.page_title || ''));
        break;
      case 'title-desc':
        sorted.sort((a, b) => (b.page_title || '').localeCompare(a.page_title || ''));
        break;
      case 'source':
        sorted.sort((a, b) => a.source_name.localeCompare(b.source_name));
        break;
    }

    return sorted;
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function truncateText(text: string | null, length: number = 150) {
    if (!text) return '(empty)';
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  const filteredPages = getFilteredPages();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900">
        <div className="flex justify-center items-center h-screen">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold">Peptide Research</h1>
              <p className="text-blue-100 mt-2">Raw data collection from 5 sources</p>
            </div>
            <DarkModeToggle />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-700 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('raw-data')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'raw-data'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            Raw Data
          </button>
          {selectedPage && (
            <button
              onClick={() => setActiveTab('full-content')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'full-content'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              Full Content
            </button>
          )}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Crawl Statistics</h2>
            {stats.length === 0 ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
                <p className="text-yellow-800 dark:text-yellow-200">No crawl data available. Run the crawl script to populate data.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.map(stat => (
                  <div key={stat.source_name} className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{stat.source_name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Pages:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{stat.total_pages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">With Markdown:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{stat.pages_with_markdown}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Crawl Batches:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{stat.crawl_batches}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Last Crawl:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatDate(stat.last_crawl)}</span>
                      </div>
                      {stat.errors_no_html > 0 && (
                        <div className="flex justify-between text-red-600 dark:text-red-400">
                          <span>Errors:</span>
                          <span className="font-semibold">{stat.errors_no_html}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Raw Data Tab */}
        {activeTab === 'raw-data' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Raw Peptide Data</h2>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Source Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Source
                  </label>
                  <select
                    value={selectedSource}
                    onChange={e => setSelectedSource(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Sources</option>
                    {sources.map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sort
                  </label>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as SortOption)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    <option value="date-newest">Newest First</option>
                    <option value="date-oldest">Oldest First</option>
                    <option value="title-asc">Title A-Z</option>
                    <option value="title-desc">Title Z-A</option>
                    <option value="source">Source</option>
                  </select>
                </div>

                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Search title, URL, or content..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredPages.length} of {pages.length} pages
            </div>

            {/* Pages List */}
            {filteredPages.length === 0 ? (
              <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">No pages match your filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPages.map(page => (
                  <div
                    key={page.id}
                    className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedPage(page);
                      setActiveTab('full-content');
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          {page.page_title || '(Untitled)'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 break-words">
                          {page.page_url}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
                          {truncateText(page.raw_markdown || page.raw_html, 200)}
                        </p>
                        <div className="flex flex-wrap gap-2 items-center">
                          <Badge label={page.source_name} />
                          {page.metadata?.statusCode && (
                            <Badge 
                              label={`HTTP ${page.metadata.statusCode}`}
                            />
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {formatDate(page.crawl_timestamp)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {page.raw_markdown ? 'MD' : 'HTML'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Full Content Tab */}
        {activeTab === 'full-content' && selectedPage && (
          <div>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedPage.page_title || '(Untitled)'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 break-words mb-2">
                  {selectedPage.page_url}
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge label={selectedPage.source_name} color="blue" />
                  {selectedPage.metadata?.statusCode && (
                    <Badge 
                      label={`HTTP ${selectedPage.metadata.statusCode}`}
                      color={selectedPage.metadata.statusCode === 200 ? 'green' : 'yellow'}
                    />
                  )}
                  <span className="text-sm text-gray-500 dark:text-gray-500">
                    Crawled: {formatDate(selectedPage.crawl_timestamp)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedPage(null);
                  setActiveTab('raw-data');
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
              >
                Back to List
              </button>
            </div>

            {/* Metadata */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Metadata</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">HTTP Status:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedPage.metadata?.statusCode || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Charset:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedPage.metadata?.charset || 'utf-8'}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Language:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedPage.metadata?.language || 'unknown'}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Crawl Time:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedPage.metadata?.crawlDurationMs || 0}ms</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content</h3>
              <div className="prose dark:prose-invert max-w-none">
                <pre className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg overflow-auto max-h-96 text-xs">
                  {selectedPage.raw_markdown || selectedPage.raw_html || '(No content)'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
