'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toQueryString } from '@/lib/query-string';
import type { Finding } from '@/types/api';

export interface FindingFilters {
  repositoryId?: string;
  severity?: string;
  status?: string;
  packageName?: string;
  page?: number;
  limit?: number;
}

export function useFindings(filters: FindingFilters = {}) {
  return useQuery({
    queryKey: ['findings', filters],
    queryFn: () => apiClient.getPaginated<Finding>(`/api/v1/findings${toQueryString(filters)}`),
  });
}

export function useFinding(id: string) {
  return useQuery({
    queryKey: ['findings', id],
    queryFn: () => apiClient.get<Finding>(`/api/v1/findings/${id}`),
    enabled: Boolean(id),
  });
}

export function useUpdateFindingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, ignoredReason }: { id: string; status: 'open' | 'resolved' | 'ignored'; ignoredReason?: string }) =>
      apiClient.patch<Finding>(`/api/v1/findings/${id}/status`, { status, ignoredReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
    },
  });
}
