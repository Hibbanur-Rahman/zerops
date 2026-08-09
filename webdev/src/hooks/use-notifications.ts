'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { NotificationItem, NotificationPreferences } from '@/types/api';

export function useNotifications(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['notifications', page, limit],
    queryFn: () => apiClient.getPaginated<NotificationItem>(`/api/v1/notifications?page=${page}&limit=${limit}`),
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => apiClient.get<NotificationPreferences>('/api/v1/notification-preferences'),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<NotificationPreferences>) =>
      apiClient.patch<NotificationPreferences>('/api/v1/notification-preferences', input),
    onSuccess: (data) => {
      queryClient.setQueryData(['notification-preferences'], data);
    },
  });
}
