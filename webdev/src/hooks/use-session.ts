'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/lib/api-client';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  avatarUrl?: string;
}

export const sessionQueryKey = ['session', 'me'] as const;

export function useSession() {
  const query = useQuery<SessionUser>({
    queryKey: sessionQueryKey,
    queryFn: () => apiClient.get<SessionUser>('/api/v1/auth/me'),
    retry: false,
    staleTime: 60_000,
  });

  const isUnauthenticated = query.isError && query.error instanceof ApiError && query.error.status === 401;

  return { ...query, isUnauthenticated };
}

export function useInvalidateSession() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: sessionQueryKey });
}
