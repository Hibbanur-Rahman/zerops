'use client';

import { use } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SecurityScore } from '@/components/security-score';
import { SeverityBadge } from '@/components/severity-badge';
import { EmptyState } from '@/components/empty-state';
import { useRepository, useTriggerScan, useUpdateRepository } from '@/hooks/use-repositories';
import { ApiError } from '@/lib/api-client';
import type { RiskLevel } from '@/types/api';

const SEVERITY_ORDER: RiskLevel[] = ['CRITICAL', 'SEVERE', 'HIGH', 'MODERATE', 'LOW'];

export default function RepositoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useRepository(id);
  const updateRepo = useUpdateRepository(id);
  const triggerScan = useTriggerScan(id);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <EmptyState title="Repository not found" />
      </div>
    );
  }

  const { repository, stats, recentAnalyses } = data;

  function handleScan() {
    triggerScan.mutate(undefined, {
      onSuccess: () => toast.success('Scan started'),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Failed to start scan'),
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{repository.fullName}</h1>
          <a
            href={repository.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
          >
            View on GitHub <ExternalLink className="size-3" />
          </a>
        </div>
        <Button onClick={handleScan} disabled={triggerScan.isPending}>
          <RefreshCw className={triggerScan.isPending ? 'size-4 animate-spin' : 'size-4'} />
          Run scan
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Security score</CardDescription>
            <CardTitle className="text-2xl">
              <SecurityScore score={repository.securityScore} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open pull requests</CardDescription>
            <CardTitle className="text-2xl">{stats.openPullRequestCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Default branch</CardDescription>
            <CardTitle className="text-2xl">{repository.defaultBranch}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open findings by severity</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          {SEVERITY_ORDER.map((level) => (
            <div key={level} className="flex flex-col items-center gap-1">
              <SeverityBadge severity={level} />
              <span className="text-lg font-semibold">{stats.openFindingsBySeverity[level] ?? 0}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="monitoring">Monitoring enabled</Label>
              <p className="text-sm text-muted-foreground">Analyze pushes and pull requests automatically.</p>
            </div>
            <Switch
              id="monitoring"
              checked={repository.monitoringEnabled}
              onCheckedChange={(checked) => updateRepo.mutate({ monitoringEnabled: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="full-scan">Full scans on every push</Label>
              <p className="text-sm text-muted-foreground">Analyze even when no dependency files changed.</p>
            </div>
            <Switch
              id="full-scan"
              checked={repository.fullScanEnabled}
              onCheckedChange={(checked) => updateRepo.mutate({ fullScanEnabled: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="fail-critical">Fail check on critical findings</Label>
            </div>
            <Switch
              id="fail-critical"
              checked={repository.policy.failOnCritical}
              onCheckedChange={(checked) => updateRepo.mutate({ policy: { failOnCritical: checked } })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="fail-high">Fail check on high findings</Label>
            </div>
            <Switch
              id="fail-high"
              checked={repository.policy.failOnHigh}
              onCheckedChange={(checked) => updateRepo.mutate({ policy: { failOnHigh: checked } })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent scans</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAnalyses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scans yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAnalyses.map((analysis) => (
                  <TableRow key={analysis._id}>
                    <TableCell>
                      <Link href={`/repositories/${repository._id}/analysis/${analysis._id}`} className="hover:underline">
                        {analysis.analysisType === 'pull_request' ? `PR #${analysis.pullRequestNumber}` : analysis.analysisType}
                      </Link>
                    </TableCell>
                    <TableCell>{analysis.overallRisk ? <SeverityBadge severity={analysis.overallRisk} /> : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{analysis.status}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(analysis.createdAt).toLocaleString()}</TableCell>
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
