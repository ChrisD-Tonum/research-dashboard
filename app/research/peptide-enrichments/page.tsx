'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DarkModeToggle from '@/app/components/DarkModeToggle';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import Badge from '@/app/components/Badge';
import { useToast } from '@/app/components/ToastContainer';

interface PeptideEnrichment {
  id: string;
  peptide_id: string;
  phase_2_data?: any;
  phase_2_success: boolean;
  phase_3_synthesis?: any;
  phase_3_success: boolean;
  enrichment_version: number;
  created_at: string;
  peptides?: {
    id: string;
    name: string;
    sequence?: string;
    molecular_weight?: number;
    source?: string;
    category_function?: string;
  };
}

export default function PeptideEnrichmentsPage() {
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const [enrichments, setEnrichments] = useState<PeptideEnrichment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setSelectedId(id);
      fetchEnrichmentDetails(id);
    } else {
      fetchAllEnrichments();
    }
  }, [searchParams]);

  async function fetchEnrichmentDetails(id: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('peptide_enrichments')
        .select(`
          *,
          peptides(id, name, sequence, molecular_weight, source, category_function)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setEnrichments(data ? [data] : []);
    } catch (error) {
      console.error('Error fetching enrichment:', error);
      addToast('Failed to load enrichment details', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllEnrichments() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('peptide_enrichments')
        .select(`
          *,
          peptides(id, name, sequence, molecular_weight, source, category_function)
        `)
        .eq('phase_2_success', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEnrichments(data || []);
    } catch (error) {
      console.error('Error fetching enrichments:', error);
      addToast('Failed to load enrichments', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <DarkModeToggle />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Peptide Enrichments (Phase 2)
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View enriched peptide data with research details
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {enrichments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No enriched peptides found
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {enrichments.map((enrichment) => (
              <div
                key={enrichment.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {enrichment.peptides?.name || 'Unknown Peptide'}
                      </h2>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {enrichment.peptides?.category_function && (
                          <Badge
                            label={enrichment.peptides.category_function}
                            variant="source"
                          />
                        )}
                        {enrichment.phase_3_synthesis && (
                          <Badge label="Has Synthesis Report" variant="date" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4 space-y-6">
                  {/* Basic Peptide Info */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Peptide Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {enrichment.peptides?.sequence && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Sequence</p>
                          <p className="text-gray-900 dark:text-gray-100 font-mono text-sm break-all">
                            {enrichment.peptides.sequence}
                          </p>
                        </div>
                      )}
                      {enrichment.peptides?.molecular_weight && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Molecular Weight</p>
                          <p className="text-gray-900 dark:text-gray-100">
                            {enrichment.peptides.molecular_weight} Da
                          </p>
                        </div>
                      )}
                      {enrichment.peptides?.source && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Source</p>
                          <p className="text-gray-900 dark:text-gray-100">
                            {enrichment.peptides.source}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Phase 2 Enrichment Data */}
                  {enrichment.phase_2_data && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Phase 2 Enrichment Analysis
                      </h3>
                      <div className="space-y-4">
                        {enrichment.phase_2_data.overview && (
                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Overview
                            </p>
                            <p className="text-gray-900 dark:text-gray-100">
                              {enrichment.phase_2_data.overview}
                            </p>
                          </div>
                        )}

                        {enrichment.phase_2_data.mechanism_of_action && (
                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Mechanism of Action
                            </p>
                            <p className="text-gray-900 dark:text-gray-100">
                              {enrichment.phase_2_data.mechanism_of_action}
                            </p>
                          </div>
                        )}

                        {enrichment.phase_2_data.potential_benefits &&
                          Array.isArray(enrichment.phase_2_data.potential_benefits) &&
                          enrichment.phase_2_data.potential_benefits.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                                Potential Benefits
                              </p>
                              <ul className="list-disc list-inside space-y-1 text-gray-900 dark:text-gray-100">
                                {enrichment.phase_2_data.potential_benefits.map(
                                  (benefit: string, idx: number) => (
                                    <li key={idx}>{benefit}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}

                        {enrichment.phase_2_data.research_categories &&
                          Array.isArray(enrichment.phase_2_data.research_categories) &&
                          enrichment.phase_2_data.research_categories.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                                Research Categories
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {enrichment.phase_2_data.research_categories.map(
                                  (cat: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium"
                                    >
                                      {cat}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        {enrichment.phase_2_data.confidence_score && (
                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                              Confidence Score
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500"
                                  style={{
                                    width: `${enrichment.phase_2_data.confidence_score * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="text-gray-900 dark:text-gray-100 font-medium">
                                {(enrichment.phase_2_data.confidence_score * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Phase 3 Synthesis (if available) */}
                  {enrichment.phase_3_synthesis && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Phase 3 Synthesis Report
                      </h3>
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                        <pre className="text-xs text-gray-900 dark:text-gray-100 overflow-auto max-h-96">
                          {JSON.stringify(enrichment.phase_3_synthesis, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-xs text-gray-600 dark:text-gray-400">
                    <p>Enrichment ID: {enrichment.id}</p>
                    <p>Version: {enrichment.enrichment_version}</p>
                    <p>Created: {new Date(enrichment.created_at).toLocaleString()}</p>
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
