'use client';

import Link from 'next/link';
import { FolderGit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SeverityBadge } from '@/components/severity-badge';
import { EmptyState } from '@/components/empty-state';
import { RiskDistributionChart } from '@/components/risk-distribution-chart';
import { useSession } from '@/hooks/use-session';
import { useDashboardActivity, useDashboardOverview } from '@/hooks/use-dashboard';

export default function DashboardPage() {
  const { data: user } = useSession();
  const { data: overview, isLoading: overviewLoading } = useDashboardOverview();
  const { data: activity, isLoading: activityLoading } = useDashboardActivity();

  if (overviewLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!overview) {
    return null;
  }

  const heading = (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome{user ? `, ${user.name}` : ''}</h1>
      <p className="text-muted-foreground">Here&apos;s the state of your repositories.</p>
    </div>
  );

  if (overview.totalRepositories === 0) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        {heading}
        <EmptyState
          icon={FolderGit2}
          title="No repositories connected yet"
          description="Connect your GitHub account and install the Package Risk Analyzer GitHub App to start monitoring dependency risk."
          action={
            <Button asChild>
              <Link href="/settings/github">Connect GitHub</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {heading}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monitored repositories</CardDescription>
            <CardTitle className="text-2xl">
              {overview.monitoredRepositories}
              <span className="text-sm font-normal text-muted-foreground"> / {overview.totalRepositories}</span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Dependencies tracked</CardDescription>
            <CardTitle className="text-2xl">{overview.totalDependencies.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open findings</CardDescription>
            <CardTitle className="text-2xl">{overview.totalVulnerabilities.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk distribution</CardTitle>
          <CardDescription>Open findings across your monitored repositories, by severity.</CardDescription>
        </CardHeader>
        <CardContent>
          <RiskDistributionChart
            data={{ critical: overview.critical, high: overview.high, medium: overview.medium, low: overview.low }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>The latest analyses across all of your repositories.</CardDescription>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !activity || activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No analyses yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repository</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link href={`/repositories/${item.repository._id}`} className="hover:underline">
                        {item.repository.fullName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <Link
                        href={`/repositories/${item.repository._id}/analysis/${item.id}`}
                        className="hover:underline"
                      >
                        {item.analysisType === 'pull_request' ? `PR #${item.pullRequestNumber}` : item.analysisType}
                      </Link>
                    </TableCell>
                    <TableCell>{item.overallRisk ? <SeverityBadge severity={item.overallRisk} /> : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.status}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
