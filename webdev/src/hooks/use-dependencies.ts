'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toQueryString } from '@/lib/query-string';
import type { Dependency, DependencyVersion, Vulnerability } from '@/types/api';

export function useDependencies(search = '', page = 1, limit = 20) {
  return useQuery({
    queryKey: ['dependencies', search, page, limit],
    queryFn: () => apiClient.getPaginated<Dependency>(`/api/v1/dependencies${toQueryString({ search, page, limit })}`),
  });
}

export interface DependencyDetail {
  dependency: Dependency;
  versions: DependencyVersion[];
  vulnerabilities: Vulnerability[];
}

export function useDependency(id: string) {
  return useQuery({
    queryKey: ['dependencies', id],
    queryFn: () => apiClient.get<DependencyDetail>(`/api/v1/dependencies/${id}`),
    enabled: Boolean(id),
  });
}
