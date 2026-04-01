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
  type: 'article';
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
  type: 'page';
}

type ContentItem = Article | WebPage;
type SortOption = 'date-newest' | 'date-oldest' | 'relevance' | 'source';
type ContentTypeFilter = 'all' | 'articles' | 'pages';

// Pagination interface
interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export default function ResearchPageWithPagination() {
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
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
  const [allAvailableSources, setAllAvailableSources] = useState<string[]>([]);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 20,
    totalItems: 0,
    totalPages: 0,
  });

  // Stats for the dashboard (total counts, not paginated)
  const [totalStats, setTotalStats] = useState({
    articles: 0,
    pages: 0,
  });

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

  // Fetch all available sources whenever topic changes
  useEffect(() => {
    if (!topic.trim()) {
      setAllAvailableSources([]);
      return;
    }

    async function fetchAllSources() {
      try {
        const { data: allArticles } = await supabase
          .from('articles')
          .select('source_name')
          .eq('topic', topic);

        const { data: allPages } = await supabase
          .from('web_pages')
          .select('source_name')
          .eq('topic', topic);

        const sources = new Set<string>();
        if (allArticles) {
          allArticles.forEach(a => sources.add(a.source_name));
        }
        if (allPages) {
          allPages.forEach(p => sources.add(p.source_name));
        }

        setAllAvailableSources(Array.from(sources).sort());
      } catch (error) {
        console.error('Error fetching sources:', error);
      }
    }

    fetchAllSources();
  }, [topic]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [topic, filters, contentTypeFilter, sortBy]);

  // Fetch content with pagination
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
  }, [topic, filters, contentTypeFilter, sortBy, pagination.currentPage, pagination.itemsPerPage]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const sourceFilterDiv = document.getElementById('source-filter-dropdown');
      const topicFilterDiv = document.getElementById('topic-filter-dropdown');
      
      if (sourceFilterDiv && !sourceFilterDiv.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (topicFilterDiv && !topicFilterDiv.contains(event.target as Node)) {
        setTopicDropdownOpen(false);
      }
    }

    if (dropdownOpen || topicDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [dropdownOpen, topicDropdownOpen]);

  async function fetchContent() {
    if (!topic.trim()) {
      setContent([]);
      setTotalStats({ articles: 0, pages: 0 });
      setPagination(prev => ({ ...prev, totalItems: 0, totalPages: 0 }));
      return;
    }

    setLoading(true);
    try {
      let allContent: ContentItem[] = [];
      let articleCount = 0;
      let pageCount = 0;

      // Build base queries for counting
      let articleCountQuery = supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('topic', topic);

      let pageCountQuery = supabase
        .from('web_pages')
        .select('*', { count: 'exact', head: true })
        .eq('topic', topic);

      if (filters.source !== 'all') {
        articleCountQuery = articleCountQuery.eq('source_name', filters.source);
        pageCountQuery = pageCountQuery.eq('source_name', filters.source);
      }

      if (filters.keyword) {
        articleCountQuery = articleCountQuery.ilike('title', `%${filters.keyword}%`);
        pageCountQuery = pageCountQuery.ilike('title', `%${filters.keyword}%`);
      }

      // Get total counts
      const { count: artCount } = await articleCountQuery;
      const { count: pgCount } = await pageCountQuery;
      
      articleCount = artCount || 0;
      pageCount = pgCount || 0;

      setTotalStats({ articles: articleCount, pages: pageCount });

      // Determine what to fetch based on filter
      const shouldFetchArticles = contentTypeFilter === 'all' || contentTypeFilter === 'articles';
      const shouldFetchPages = contentTypeFilter === 'all' || contentTypeFilter === 'pages';

      // Calculate offset based on content type
      let offset = (pagination.currentPage - 1) * pagination.itemsPerPage;
      let limit = pagination.itemsPerPage;

      if (contentTypeFilter === 'all') {
        // For 'all', we need to merge and paginate both types
        // This is more complex - we'll fetch more than needed and slice
        
        // Fetch articles
        if (shouldFetchArticles) {
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

          // Apply sorting
          if (sortBy === 'date-newest') {
            articleQuery = articleQuery.order('crawl_date', { ascending: false });
          } else if (sortBy === 'date-oldest') {
            articleQuery = articleQuery.order('crawl_date', { ascending: true });
          } else if (sortBy === 'source') {
            articleQuery = articleQuery.order('source_name', { ascending: true });
          }

          const { data: articleData } = await articleQuery;
          if (articleData) {
            allContent = allContent.concat(
              articleData.map(a => ({ ...a, type: 'article' as const }))
            );
          }
        }

        // Fetch pages
        if (shouldFetchPages) {
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

          // Apply sorting
          if (sortBy === 'date-newest') {
            pageQuery = pageQuery.order('crawl_date', { ascending: false });
          } else if (sortBy === 'date-oldest') {
            pageQuery = pageQuery.order('crawl_date', { ascending: true });
          } else if (sortBy === 'source') {
            pageQuery = pageQuery.order('source_name', { ascending: true });
          }

          const { data: pageData } = await pageQuery;
          if (pageData) {
            allContent = allContent.concat(
              pageData.map(p => ({ ...p, type: 'page' as const }))
            );
          }
        }

        // Sort the combined results
        allContent = sortContent(allContent, sortBy);
        
        // Apply pagination to the sorted results
        const paginatedContent = allContent.slice(offset, offset + limit);
        setContent(paginatedContent);

        const totalItems = allContent.length;
        setPagination(prev => ({
          ...prev,
          totalItems,
          totalPages: Math.ceil(totalItems / prev.itemsPerPage),
        }));

      } else {
        // For single type, use database pagination
        if (contentTypeFilter === 'articles') {
          let articleQuery = supabase
            .from('articles')
            .select('*')
            .eq('topic', topic)
            .range(offset, offset + limit - 1);

          if (filters.source !== 'all') {
            articleQuery = articleQuery.eq('source_name', filters.source);
          }

          if (filters.keyword) {
            articleQuery = articleQuery.ilike('title', `%${filters.keyword}%`);
          }

          // Apply sorting
          if (sortBy === 'date-newest') {
            articleQuery = articleQuery.order('crawl_date', { ascending: false });
          } else if (sortBy === 'date-oldest') {
            articleQuery = articleQuery.order('crawl_date', { ascending: true });
          } else if (sortBy === 'source') {
            articleQuery = articleQuery.order('source_name', { ascending: true });
          }

          const { data: articleData } = await articleQuery;
          if (articleData) {
            allContent = articleData.map(a => ({ ...a, type: 'article' as const }));
          }

          setContent(allContent);
          setPagination(prev => ({
            ...prev,
            totalItems: articleCount,
            totalPages: Math.ceil(articleCount / prev.itemsPerPage),
          }));

        } else if (contentTypeFilter === 'pages') {
          let pageQuery = supabase
            .from('web_pages')
            .select('*')
            .eq('topic', topic)
            .range(offset, offset + limit - 1);

          if (filters.source !== 'all') {
            pageQuery = pageQuery.eq('source_name', filters.source);
          }

          if (filters.keyword) {
            pageQuery = pageQuery.ilike('title', `%${filters.keyword}%`);
          }

          // Apply sorting
          if (sortBy === 'date-newest') {
            pageQuery = pageQuery.order('crawl_date', { ascending: false });
          } else if (sortBy === 'date-oldest') {
            pageQuery = pageQuery.order('crawl_date', { ascending: true });
          } else if (sortBy === 'source') {
            pageQuery = pageQuery.order('source_name', { ascending: true });
          }

          const { data: pageData } = await pageQuery;
          if (pageData) {
            allContent = pageData.map(p => ({ ...p, type: 'page' as const }));
          }

          setContent(allContent);
          setPagination(prev => ({
            ...prev,
            totalItems: pageCount,
            totalPages: Math.ceil(pageCount / prev.itemsPerPage),
          }));
        }
      }
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

  function handlePageChange(newPage: number) {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
      // Scroll to top of content
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handleItemsPerPageChange(newItemsPerPage: number) {
    setPagination(prev => ({
      ...prev,
      itemsPerPage: newItemsPerPage,
      currentPage: 1, // Reset to first page
      totalPages: Math.ceil(prev.totalItems / newItemsPerPage),
    }));
  }

  function handleClearAllFilters() {
    setFilters({ source: 'all', keyword: '' });
    setContentTypeFilter('all');
    addToast('Filters cleared', 'info');
  }

  async function handleExportCSV() {
    try {
      // For export, fetch ALL data (not paginated)
      setLoading(true);
      
      // Fetch all matching content without pagination
      let allExportContent: ContentItem[] = [];
      
      // Fetch all articles
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

      const { data: articleData } = await articleQuery;
      if (articleData) {
        allExportContent = allExportContent.concat(
          articleData.map(a => ({ ...a, type: 'article' as const }))
        );
      }

      // Fetch all pages
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

      const { data: pageData } = await pageQuery;
      if (pageData) {
        allExportContent = allExportContent.concat(
          pageData.map(p => ({ ...p, type: 'page' as const }))
        );
      }

      await exportToCSV(allExportContent as any, topic);
      addToast(`Exported ${allExportContent.length} items to CSV`, 'success');
    } catch (error) {
      console.error('Export error:', error);
      addToast('Failed to export CSV', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleExportJSON() {
    try {
      // Similar to CSV, export all data
      setLoading(true);
      
      let allExportContent: ContentItem[] = [];
      
      // Fetch all articles
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

      const { data: articleData } = await articleQuery;
      if (articleData) {
        allExportContent = allExportContent.concat(
          articleData.map(a => ({ ...a, type: 'article' as const }))
        );
      }

      // Fetch all pages
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

      const { data: pageData } = await pageQuery;
      if (pageData) {
        allExportContent = allExportContent.concat(
          pageData.map(p => ({ ...p, type: 'page' as const }))
        );
      }

      const exportData = {
        topic,
        exportedAt: new Date().toISOString(),
        items: allExportContent,
        stats: {
          totalItems: allExportContent.length,
          articles: allExportContent.filter(c => c.type === 'article').length,
          pages: allExportContent.filter(c => c.type === 'page').length,
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
      
      addToast(`Exported ${allExportContent.length} items to JSON`, 'success');
    } catch (error) {
      console.error('Export error:', error);
      addToast('Failed to export JSON', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPDF() {
    try {
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

  const activeFilterCount = 
    (filters.source !== 'all' ? 1 : 0) + 
    (filters.keyword ? 1 : 0) + 
    (contentTypeFilter !== 'all' ? 1 : 0);

  // Create pagination controls component
  const PaginationControls = () => {
    const startItem = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
    const endItem = Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems);
    
    // Calculate page range to show
    const maxPagesToShow = 5;
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxPagesToShow - 1);
    
    // Adjust start if we're near the end
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    const pageNumbers = [];
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="card-base p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Showing {startItem}-{endItem} of {pagination.totalItems} items
          </span>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Items per page:</label>
            <select
              value={pagination.itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* First page button */}
          <button
            onClick={() => handlePageChange(1)}
            disabled={pagination.currentPage === 1}
            className="px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="First page"
          >
            ««
          </button>
          
          {/* Previous page button */}
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            «
          </button>

          {/* Page numbers */}
          {startPage > 1 && (
            <>
              <button
                onClick={() => handlePageChange(1)}
                className="px-3 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                1
              </button>
              {startPage > 2 && <span className="px-2 text-gray-400">...</span>}
            </>
          )}
          
          {pageNumbers.map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-1 text-sm rounded transition ${
                pagination.currentPage === page
                  ? 'bg-indigo-600 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {page}
            </button>
          ))}
          
          {endPage < pagination.totalPages && (
            <>
              {endPage < pagination.totalPages - 1 && <span className="px-2 text-gray-400">...</span>}
              <button
                onClick={() => handlePageChange(pagination.totalPages)}
                className="px-3 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {pagination.totalPages}
              </button>
            </>
          )}

          {/* Next page button */}
          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            »
          </button>
          
          {/* Last page button */}
          <button
            onClick={() => handlePageChange(pagination.totalPages)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Last page"
          >
            »»
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-8 transition-colors md:ml-0">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start pt-10 md:pt-0">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
              Research Content
            </h1>
            <p className="text-gray-600 dark:text-gray-300">Articles & Reference Pages with Pagination</p>
          </div>
          <DarkModeToggle />
        </div>

        {/* Topic Dropdown */}
        <div className="card-base card-hover p-6 mb-6 relative" id="topic-filter-dropdown">
          <label className="block text-sm font-medium text-header-primary mb-2">
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
            href={`/research/synthesis${topic ? `?topic=${encodeURIComponent(topic)}` : ''}`}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg text-sm font-medium transition shadow-md hover:shadow-lg"
          >
            📊 View Synthesis
          </a>
        </div>

        {/* Stats Dashboard - using total stats, not paginated content */}
        <div className="card-base p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {totalStats.articles}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Articles</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {totalStats.pages}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pages</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {totalStats.articles + totalStats.pages}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {allAvailableSources.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sources</p>
            </div>
          </div>
        </div>

        {/* Content Type Filter */}
        <div className="card-base p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Content Type</h3>
          <div className="flex gap-2">
            {(['all', 'articles', 'pages'] as const).map(type => {
              const displayCount = type === 'all' 
                ? (totalStats.articles + totalStats.pages) 
                : (type === 'articles' ? totalStats.articles : totalStats.pages);
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
                  {allAvailableSources.length > 0 && allAvailableSources.map(source => (
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
                onChange={(e) => setSortBy(e.target.value as SortOption)}
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
              disabled={loading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition shadow-md hover:shadow-lg disabled:opacity-50"
            >
              📊 Export All to CSV
            </button>
            <button
              onClick={handleExportJSON}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-md hover:shadow-lg disabled:opacity-50"
            >
              📄 Export All to JSON
            </button>
            <button
              onClick={handleExportPDF}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition shadow-md hover:shadow-lg disabled:opacity-50"
            >
              📕 Export to PDF
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Exports will include all filtered results, not just current page
          </p>
        </div>

        {/* Pagination Controls - Top */}
        {!loading && pagination.totalItems > 0 && <PaginationControls />}

        {/* Content List */}
        {loading ? (
          <LoadingSpinner />
        ) : content.length === 0 ? (
          <div className="card-base p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {topic ? `No content found for "${topic}"` : 'Enter a topic to begin'}
            </p>
            {topic && (
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Try a different topic or run the crawlers first
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4 my-4">
            {content.map((item, index) => (
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

        {/* Pagination Controls - Bottom */}
        {!loading && pagination.totalItems > 0 && <PaginationControls />}
      </div>
    </div>
  );
}