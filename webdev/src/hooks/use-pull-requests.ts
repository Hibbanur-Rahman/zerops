'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toQueryString } from '@/lib/query-string';
import type { Finding, PullRequest } from '@/types/api';

export function usePullRequests(filters: { repositoryId?: string; state?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ['pull-requests', filters],
    queryFn: () => apiClient.getPaginated<PullRequest>(`/api/v1/pull-requests${toQueryString(filters)}`),
  });
}

export function usePullRequest(id: string) {
  return useQuery({
    queryKey: ['pull-requests', id],
    queryFn: () => apiClient.get<{ pullRequest: PullRequest; findings: Finding[] }>(`/api/v1/pull-requests/${id}`),
    enabled: Boolean(id),
  });
}
