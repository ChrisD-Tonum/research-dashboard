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

export default function PeptideSynthesisPage() {
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const [enrichments, setEnrichments] = useState<PeptideEnrichment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setSelectedId(id);
      fetchSynthesisDetails(id);
    } else {
      fetchAllSynthesis();
    }
  }, [searchParams]);

  async function fetchSynthesisDetails(id: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('peptide_enrichments')
        .select(`
          *,
          peptides(id, name, sequence, molecular_weight, source, category_function)
        `)
        .eq('id', id)
        .not('phase_3_synthesis', 'is', null)
        .single();

      if (error) throw error;

      setEnrichments(data ? [data] : []);
    } catch (error) {
      console.error('Error fetching synthesis:', error);
      addToast('Failed to load synthesis details', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllSynthesis() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('peptide_enrichments')
        .select(`
          *,
          peptides(id, name, sequence, molecular_weight, source, category_function)
        `)
        .not('phase_3_synthesis', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEnrichments(data || []);
    } catch (error) {
      console.error('Error fetching synthesis:', error);
      addToast('Failed to load synthesis reports', 'error');
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
            Peptide Synthesis Reports (Phase 3)
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View AI-generated synthesis reports for enriched peptides
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {enrichments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No synthesis reports found. Run Phase 3 synthesis generation first.
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
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
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
                        <Badge label="Synthesis Generated" variant="date" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4 space-y-6">
                  {enrichment.phase_3_synthesis && (
                    <>
                      {/* Executive Summary */}
                      {enrichment.phase_3_synthesis.executive_summary && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Executive Summary
                          </h3>
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {enrichment.phase_3_synthesis.executive_summary}
                          </p>
                        </div>
                      )}

                      {/* Key Themes */}
                      {enrichment.phase_3_synthesis.key_themes &&
                        Array.isArray(enrichment.phase_3_synthesis.key_themes) && (
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                              Key Themes
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {enrichment.phase_3_synthesis.key_themes.map(
                                (theme: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
                                  >
                                    {theme}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      {/* Therapeutic Applications */}
                      {enrichment.phase_3_synthesis.therapeutic_applications &&
                        Array.isArray(enrichment.phase_3_synthesis.therapeutic_applications) && (
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                              Therapeutic Applications
                            </h3>
                            <div className="space-y-3">
                              {enrichment.phase_3_synthesis.therapeutic_applications.map(
                                (app: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                          {app.application}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                          {app.notes}
                                        </p>
                                      </div>
                                      <Badge
                                        label={app.evidence_strength}
                                        variant="severity"
                                      />
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      {/* Mechanisms Overview */}
                      {enrichment.phase_3_synthesis.mechanisms_overview && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Mechanisms Overview
                          </h3>
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {enrichment.phase_3_synthesis.mechanisms_overview}
                          </p>
                        </div>
                      )}

                      {/* Safety Considerations */}
                      {enrichment.phase_3_synthesis.safety_considerations &&
                        Array.isArray(enrichment.phase_3_synthesis.safety_considerations) &&
                        enrichment.phase_3_synthesis.safety_considerations.length > 0 && (
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                              Safety Considerations
                            </h3>
                            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                              {enrichment.phase_3_synthesis.safety_considerations.map(
                                (consideration: string, idx: number) => (
                                  <li key={idx}>{consideration}</li>
                                )
                              )}
                            </ul>
                          </div>
                        )}

                      {/* Research Gaps */}
                      {enrichment.phase_3_synthesis.research_gaps &&
                        Array.isArray(enrichment.phase_3_synthesis.research_gaps) &&
                        enrichment.phase_3_synthesis.research_gaps.length > 0 && (
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                              Research Gaps
                            </h3>
                            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                              {enrichment.phase_3_synthesis.research_gaps.map(
                                (gap: string, idx: number) => (
                                  <li key={idx}>{gap}</li>
                                )
                              )}
                            </ul>
                          </div>
                        )}

                      {/* Recommendations */}
                      {enrichment.phase_3_synthesis.recommendations &&
                        Array.isArray(enrichment.phase_3_synthesis.recommendations) && (
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                              Recommendations
                            </h3>
                            <div className="space-y-3">
                              {enrichment.phase_3_synthesis.recommendations.map(
                                (rec: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                          {rec.category}: {rec.recommendation}
                                        </p>
                                      </div>
                                      <Badge
                                        label={rec.priority}
                                        variant="severity"
                                      />
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      {/* Evidence Summary */}
                      {enrichment.phase_3_synthesis.evidence_summary && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Evidence Summary
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            {enrichment.phase_3_synthesis.evidence_summary.total_studies && (
                              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Total Studies
                                </p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {enrichment.phase_3_synthesis.evidence_summary.total_studies}
                                </p>
                              </div>
                            )}
                            {enrichment.phase_3_synthesis.evidence_summary.publication_years && (
                              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Publication Period
                                </p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">
                                  {enrichment.phase_3_synthesis.evidence_summary.publication_years}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Confidence Score */}
                      {enrichment.phase_3_synthesis.confidence_score && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Overall Confidence
                          </h3>
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                                  style={{
                                    width: `${enrichment.phase_3_synthesis.confidence_score * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white min-w-max">
                              {(enrichment.phase_3_synthesis.confidence_score * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Metadata */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-xs text-gray-600 dark:text-gray-400">
                    <p>Enrichment ID: {enrichment.id}</p>
                    <p>Generated: {new Date(enrichment.created_at).toLocaleString()}</p>
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
