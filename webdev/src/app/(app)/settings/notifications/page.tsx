'use client';

import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/use-notifications';
import { ApiError } from '@/lib/api-client';
import type { NotificationPreferences } from '@/types/api';

const SEVERITY_TOGGLES: Array<{ key: keyof NotificationPreferences; label: string }> = [
  { key: 'notifyOnCritical', label: 'Critical findings' },
  { key: 'notifyOnHigh', label: 'High findings' },
  { key: 'notifyOnMedium', label: 'Medium findings' },
  { key: 'notifyOnLow', label: 'Low findings' },
];

const EVENT_TOGGLES: Array<{ key: keyof NotificationPreferences; label: string }> = [
  { key: 'notifyOnPush', label: 'Pushes' },
  { key: 'notifyOnPullRequest', label: 'Pull requests' },
];

export default function NotificationSettingsPage() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  function handleToggle(key: keyof NotificationPreferences, value: boolean) {
    update.mutate(
      { [key]: value },
      { onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Failed to update preferences') },
    );
  }

  if (isLoading || !prefs) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">Choose when Package Risk Analyzer sends you an email.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email notifications</CardTitle>
          <CardDescription>Turn all email notifications on or off.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="email-enabled">Email notifications enabled</Label>
            <Switch
              id="email-enabled"
              checked={prefs.emailNotificationsEnabled}
              onCheckedChange={(checked) => handleToggle('emailNotificationsEnabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notify me for</CardTitle>
          <CardDescription>Choose which severities trigger an email.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {SEVERITY_TOGGLES.map((toggle, i) => (
            <div key={toggle.key}>
              <div className="flex items-center justify-between">
                <Label htmlFor={toggle.key}>{toggle.label}</Label>
                <Switch
                  id={toggle.key}
                  checked={Boolean(prefs[toggle.key])}
                  disabled={!prefs.emailNotificationsEnabled}
                  onCheckedChange={(checked) => handleToggle(toggle.key, checked)}
                />
              </div>
              {i < SEVERITY_TOGGLES.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notify me on</CardTitle>
          <CardDescription>Choose which events can trigger an email.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {EVENT_TOGGLES.map((toggle, i) => (
            <div key={toggle.key}>
              <div className="flex items-center justify-between">
                <Label htmlFor={toggle.key}>{toggle.label}</Label>
                <Switch
                  id={toggle.key}
                  checked={Boolean(prefs[toggle.key])}
                  disabled={!prefs.emailNotificationsEnabled}
                  onCheckedChange={(checked) => handleToggle(toggle.key, checked)}
                />
              </div>
              {i < EVENT_TOGGLES.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
