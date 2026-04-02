'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { exportToCSV, exportToJSON, exportToPDF } from '@/lib/export';
import DarkModeToggle from '@/app/components/DarkModeToggle';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import Badge from '@/app/components/Badge';
import SearchHistory from '@/app/components/SearchHistory';

import { useToast } from '@/app/components/ToastContainer';

interface Peptide {
  id: string;
  name: string;
  sequence?: string;
  molecular_weight?: number;
  source?: string;
  category_function?: string;
}

interface PeptideEnrichment {
  id: string;
  peptide_id: string;
  phase_2_data?: any;
  phase_2_success: boolean;
  phase_3_synthesis?: any;
  phase_3_success: boolean;
  enrichment_version: number;
  peptides?: Peptide;
}

type SortOption = 'date-newest' | 'date-oldest' | 'name' | 'confidence';

// Pagination interface
interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export default function ResearchPage() {
  const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [enrichments, setEnrichments] = useState<PeptideEnrichment[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('date-newest');
  const [filters, setFilters] = useState({
    category: 'all',
    phase: 'all', // all, phase2, phase3
    keyword: '',
  });
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [peptideDropdownOpen, setPeptideDropdownOpen] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availablePeptides, setAvailablePeptides] = useState<Array<{ id: string; name: string }>>([]);
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 20,
    totalItems: 0,
    totalPages: 0,
  });

  // Stats for the dashboard
  const [totalStats, setTotalStats] = useState({
    enriched: 0,
    withSynthesis: 0,
    totalPeptides: 0,
  });

  // Fetch all available categories and peptides on mount
  useEffect(() => {
    async function fetchCategoriesAndPeptides() {
      console.log('🔄 Loading peptides from database...');
      try {
        // Fetch directly from peptides table (Phase 1 data)
        const { data: peptidesData, error: peptidesError } = await supabase
          .from('peptides')
          .select('id, name, category_function')
          .order('name', { ascending: true });

        if (peptidesError) {
          console.error('Error fetching peptides:', peptidesError);
        } else {
          console.log(`✅ Loaded ${peptidesData?.length || 0} peptides`);
          setAvailablePeptides(peptidesData || []);
        }

        // Fetch enrichments for categories (Phase 2 data - may be empty)
        const { data: enrichmentsData, error: enrichmentsError } = await supabase
          .from('peptide_enrichments')
          .select('peptide_id, peptides(category_function)') as any;

        if (enrichmentsError) {
          console.error('Error fetching enrichments:', enrichmentsError);
        }

        const categories = new Set<string>();
        if (enrichmentsData) {
          enrichmentsData.forEach((e: any) => {
            if (e.peptides?.category_function) {
              categories.add(e.peptides.category_function);
            }
          });
        }

        if (categories.size > 0) {
          setAvailableCategories(Array.from(categories).sort());
        }
      } catch (error) {
        console.error('Error fetching categories and peptides:', error);
      }
    }

    fetchCategoriesAndPeptides();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const categoryFilterDiv = document.getElementById('category-filter-dropdown');
      const peptideFilterDiv = document.getElementById('peptide-filter-dropdown');
      
      if (categoryFilterDiv && !categoryFilterDiv.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (peptideFilterDiv && !peptideFilterDiv.contains(event.target as Node)) {
        setPeptideDropdownOpen(false);
      }
    }

    if (dropdownOpen || peptideDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [dropdownOpen, peptideDropdownOpen]);

  // Fetch enrichments whenever search/filter/sort changes
  useEffect(() => {
    fetchEnrichments();
  }, [searchTerm, sortBy, filters, pagination.currentPage]);

  async function fetchEnrichments() {
    setLoading(true);
    try {
      // Build base query
      let query = supabase
        .from('peptide_enrichments')
        .select(`
          *,
          peptides(id, name, sequence, molecular_weight, source, category_function)
        `)
        .eq('phase_2_success', true) as any;

      // Apply filters
      if (filters.phase === 'phase3') {
        query = query.not('phase_3_synthesis', 'is', null);
      } else if (filters.phase === 'phase2') {
        query = query.is('phase_3_synthesis', null);
      }

      // Get count for pagination
      const { count: totalCount } = await query;
      const totalItems = totalCount || 0;

      // Apply search term on peptide name
      if (searchTerm.trim()) {
        query = query.ilike('peptides.name', `%${searchTerm}%`);
      }

      // Apply category filter
      if (filters.category !== 'all') {
        query = query.eq('peptides.category_function', filters.category);
      }

      // Apply sorting
      if (sortBy === 'date-newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'date-oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (sortBy === 'name') {
        query = query.order('peptides.name', { ascending: true });
      } else if (sortBy === 'confidence') {
        query = query.order('phase_2_data', { ascending: false });
      }

      // Apply pagination
      const offset = (pagination.currentPage - 1) * pagination.itemsPerPage;
      query = query.range(offset, offset + pagination.itemsPerPage - 1);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setEnrichments(data || []);

      // Update pagination
      setPagination(prev => ({
        ...prev,
        totalItems,
        totalPages: Math.ceil(totalItems / prev.itemsPerPage),
      }));

      // Update stats
      const withSynthesis = data?.filter((e: PeptideEnrichment) => e.phase_3_synthesis).length || 0;
      setTotalStats({
        enriched: totalItems,
        withSynthesis: withSynthesis,
        totalPeptides: totalItems,
      });
    } catch (error) {
      console.error('Error fetching enrichments:', error);
      addToast('Failed to fetch enrichments', 'error');
      setEnrichments([]);
    } finally {
      setLoading(false);
    }
  }

  const getConfidenceScore = (enrichment: PeptideEnrichment): number => {
    return enrichment.phase_2_data?.confidence_score || 0;
  };

  const getResearchCategories = (enrichment: PeptideEnrichment): string[] => {
    return enrichment.phase_2_data?.research_categories || [];
  };

  const getPeptideName = (enrichment: PeptideEnrichment): string => {
    return enrichment.peptides?.name || 'Unknown Peptide';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <DarkModeToggle />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Peptide Research Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Browse and analyze enriched peptide data from Phase 2 research
          </p>
        </div>
      </header>

      {/* Stats Dashboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            📊 Peptide Statistics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Enriched Peptides</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {totalStats.enriched}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">With Synthesis Reports</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {totalStats.withSynthesis}
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Phase 2 Only</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {totalStats.enriched - totalStats.withSynthesis}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="space-y-4">
            {/* Search Bar + Peptide Dropdown */}
            <div className="flex gap-3">
              {/* Peptide Dropdown */}
              <div className="relative w-48" id="peptide-filter-dropdown">
                <button
                  onClick={() => setPeptideDropdownOpen(!peptideDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg transition font-medium border border-indigo-300 dark:border-indigo-700"
                >
                  <span className="truncate">
                    {searchTerm || 'Select Peptide...'}
                  </span>
                  <span className="text-lg ml-2">▼</span>
                </button>
                {peptideDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 w-full max-h-64 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setPeptideDropdownOpen(false);
                        setPagination(prev => ({ ...prev, currentPage: 1 }));
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600"
                    >
                      Clear Selection
                    </button>
                    {availablePeptides.map(peptide => (
                      <button
                        key={peptide.id}
                        onClick={() => {
                          setSearchTerm(peptide.name);
                          setPeptideDropdownOpen(false);
                          setPagination(prev => ({ ...prev, currentPage: 1 }));
                        }}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 truncate"
                      >
                        {peptide.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search Bar */}
              <input
                type="text"
                placeholder="Search peptides by name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPagination(prev => ({ ...prev, currentPage: 1 }));
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              {/* Category Filter */}
              <div className="relative" id="category-filter-dropdown">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg transition font-medium"
                >
                  Category: {filters.category === 'all' ? 'All' : filters.category}
                  <span className="text-lg">▼</span>
                </button>
                {dropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 min-w-48">
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, category: 'all' }));
                        setDropdownOpen(false);
                        setPagination(prev => ({ ...prev, currentPage: 1 }));
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                    >
                      All Categories
                    </button>
                    {availableCategories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          setFilters(prev => ({ ...prev, category: cat }));
                          setDropdownOpen(false);
                          setPagination(prev => ({ ...prev, currentPage: 1 }));
                        }}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Phase Filter */}
              <select
                value={filters.phase}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, phase: e.target.value as any }));
                  setPagination(prev => ({ ...prev, currentPage: 1 }));
                }}
                className="px-4 py-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-green-500 transition font-medium cursor-pointer"
              >
                <option value="all">All Phases</option>
                <option value="phase2">Phase 2 Only (No Synthesis)</option>
                <option value="phase3">Phase 3 (With Synthesis)</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as SortOption);
                  setPagination(prev => ({ ...prev, currentPage: 1 }));
                }}
                className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-medium cursor-pointer"
              >
                <option value="date-newest">Newest First</option>
                <option value="date-oldest">Oldest First</option>
                <option value="name">Name (A-Z)</option>
                <option value="confidence">Confidence (High-Low)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {/* Results */}
        {!loading && (
          <>
            {enrichments.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
                <div className="max-w-md mx-auto">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    🧬 No Enriched Peptides Yet
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {searchTerm || Object.values(filters).some(v => v !== 'all')
                      ? 'No peptides match your search criteria.'
                      : `Phase 1 crawl found ${availablePeptides.length} peptides, but Phase 2 enrichment hasn't run yet.`}
                  </p>
                  {availablePeptides.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                        ✅ <strong>{availablePeptides.length} peptides</strong> are ready in Phase 1
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Run Phase 2 enrichment to analyze and display these peptides:
                      </p>
                      <code className="text-xs bg-gray-900 text-green-400 p-2 rounded mt-2 block font-mono">
                        node scripts/crawl.cjs --stage enrichment
                      </code>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {enrichments.map((enrichment) => (
                  <div
                    key={enrichment.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition p-6 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {getPeptideName(enrichment)}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {enrichment.peptides?.category_function && (
                            <Badge
                              label={enrichment.peptides.category_function}
                              variant="source"
                            />
                          )}
                          {enrichment.phase_3_synthesis && (
                            <Badge label="Synthesis Report" variant="date" />
                          )}
                          <Badge
                            label={`Confidence: ${(getConfidenceScore(enrichment) * 100).toFixed(0)}%`}
                            variant={getConfidenceScore(enrichment) > 0.7 ? 'date' : 'default'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Enrichment Details */}
                    {enrichment.phase_2_data && (
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Overview</p>
                          <p className="text-gray-900 dark:text-gray-100 mt-1">
                            {enrichment.phase_2_data.overview?.substring(0, 100)}...
                          </p>
                        </div>
                        {enrichment.phase_2_data.mechanism_of_action && (
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Mechanism</p>
                            <p className="text-gray-900 dark:text-gray-100 mt-1">
                              {enrichment.phase_2_data.mechanism_of_action.substring(0, 100)}...
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Research Categories */}
                    {getResearchCategories(enrichment).length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Research Categories
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {getResearchCategories(enrichment).map((cat, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Links */}
                    <div className="flex gap-4 text-sm">
                      <a
                        href={`/research/peptide-enrichments?id=${enrichment.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        View Details →
                      </a>
                      {enrichment.phase_3_synthesis && (
                        <a
                          href={`/research/peptide-synthesis?id=${enrichment.id}`}
                          className="text-green-600 dark:text-green-400 hover:underline font-medium"
                        >
                          View Synthesis →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {enrichments.length > 0 && (
              <div className="mt-8 flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} to{' '}
                  {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}{' '}
                  of {pagination.totalItems} peptides
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPagination(prev => ({
                        ...prev,
                        currentPage: Math.max(1, prev.currentPage - 1),
                      }))
                    }
                    disabled={pagination.currentPage === 1}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  >
                    ← Previous
                  </button>
                  <span className="px-4 py-2 text-gray-900 dark:text-white">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setPagination(prev => ({
                        ...prev,
                        currentPage: Math.min(prev.totalPages, prev.currentPage + 1),
                      }))
                    }
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
