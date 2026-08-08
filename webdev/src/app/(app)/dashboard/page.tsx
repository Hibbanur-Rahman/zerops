'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/hooks/use-session';

export default function DashboardPage() {
  const { data: user } = useSession();

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome{user ? `, ${user.name}` : ''}</h1>
        <p className="text-muted-foreground">Here&apos;s the state of your repositories.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No repositories connected yet</CardTitle>
          <CardDescription>
            Connect your GitHub account and install the Package Risk Analyzer GitHub App to start monitoring
            dependency risk.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
