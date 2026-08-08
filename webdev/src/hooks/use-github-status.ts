'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface GithubInstallationSummary {
  id: string;
  accountLogin: string;
  accountType: 'User' | 'Organization';
  accountAvatarUrl?: string;
  repositorySelection: 'all' | 'selected';
}

export interface GithubStatus {
  connected: boolean;
  githubUsername?: string;
  avatarUrl?: string;
  installations: GithubInstallationSummary[];
}

export function useGithubStatus() {
  return useQuery<GithubStatus>({
    queryKey: ['github', 'status'],
    queryFn: () => apiClient.get<GithubStatus>('/api/v1/github/status'),
  });
}

export interface RepositorySummary {
  _id: string;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
  monitoringEnabled: boolean;
  description?: string;
}

export function useGithubRepositories(enabled: boolean) {
  return useQuery<RepositorySummary[]>({
    queryKey: ['github', 'repositories'],
    queryFn: () => apiClient.get<RepositorySummary[]>('/api/v1/github/repositories'),
    enabled,
  });
}
