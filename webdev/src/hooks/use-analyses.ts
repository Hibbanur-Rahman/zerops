'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toQueryString } from '@/lib/query-string';
import type { Analysis, AnalysisPackage, Finding } from '@/types/api';

export function useAnalyses(filters: { repositoryId?: string; analysisType?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ['analyses', filters],
    queryFn: () => apiClient.getPaginated<Analysis>(`/api/v1/analyses${toQueryString(filters)}`),
  });
}

export interface AnalysisDetail {
  analysis: Analysis;
  packages: AnalysisPackage[];
  findings: Finding[];
}

export function useAnalysis(id: string) {
  return useQuery({
    queryKey: ['analyses', id],
    queryFn: () => apiClient.get<AnalysisDetail>(`/api/v1/analyses/${id}`),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.analysis.status === 'running' || query.state.data?.analysis.status === 'pending' ? 3000 : false),
  });
}
