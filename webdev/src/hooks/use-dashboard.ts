'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ActivityItem, DashboardOverview, RiskDistribution } from '@/types/api';

export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => apiClient.get<DashboardOverview>('/api/v1/dashboard/overview'),
  });
}

export function useDashboardActivity() {
  return useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => apiClient.get<ActivityItem[]>('/api/v1/dashboard/activity'),
  });
}

export function useRiskDistribution() {
  return useQuery({
    queryKey: ['dashboard', 'risk-distribution'],
    queryFn: () => apiClient.get<RiskDistribution>('/api/v1/dashboard/risk-distribution'),
  });
}
