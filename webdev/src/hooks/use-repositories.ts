'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toQueryString } from '@/lib/query-string';
import type { Analysis, Repository, SecurityPolicy } from '@/types/api';

export function useRepositories(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['repositories', page, limit],
    queryFn: () => apiClient.getPaginated<Repository>(`/api/v1/repositories${toQueryString({ page, limit })}`),
  });
}

export interface RepositoryDetail {
  repository: Repository;
  stats: { openFindingsBySeverity: Record<string, number>; openPullRequestCount: number };
  recentAnalyses: Analysis[];
}

export function useRepository(id: string) {
  return useQuery({
    queryKey: ['repositories', id],
    queryFn: () => apiClient.get<RepositoryDetail>(`/api/v1/repositories/${id}`),
    enabled: Boolean(id),
  });
}

export function useUpdateRepository(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { monitoringEnabled?: boolean; fullScanEnabled?: boolean; policy?: Partial<SecurityPolicy> }) =>
      apiClient.patch<Repository>(`/api/v1/repositories/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
  });
}

export function useTriggerScan(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<Analysis>(`/api/v1/repositories/${id}/scan`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories', id] });
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
    },
  });
}
