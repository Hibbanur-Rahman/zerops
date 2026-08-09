'use client';

import { use } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SeverityBadge } from '@/components/severity-badge';
import { EmptyState } from '@/components/empty-state';
import { useFinding, useUpdateFindingStatus } from '@/hooks/use-findings';
import { ApiError } from '@/lib/api-client';

export default function FindingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: finding, isLoading } = useFinding(id);
  const updateStatus = useUpdateFindingStatus();

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!finding) {
    return (
      <div className="p-6">
        <EmptyState title="Finding not found" />
      </div>
    );
  }

  const repo = typeof finding.repositoryId === 'object' ? finding.repositoryId : undefined;

  function handleAction(next: 'resolved' | 'ignored' | 'open') {
    updateStatus.mutate(
      { id, status: next },
      {
        onSuccess: () => toast.success('Finding updated'),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Failed to update finding'),
      },
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {finding.packageName}
            <span className="ml-2 text-lg font-normal text-muted-foreground">{finding.packageVersion}</span>
          </h1>
          {repo && (
            <Link href={`/repositories/${repo._id}`} className="text-sm text-muted-foreground hover:underline">
              {repo.fullName}
            </Link>
          )}
        </div>
        <SeverityBadge severity={finding.severity} className="text-sm" />
      </div>

      <div className="flex gap-2">
        {finding.status !== 'resolved' && (
          <Button variant="outline" onClick={() => handleAction('resolved')} disabled={updateStatus.isPending}>
            Mark resolved
          </Button>
        )}
        {finding.status !== 'ignored' && (
          <Button variant="outline" onClick={() => handleAction('ignored')} disabled={updateStatus.isPending}>
            Ignore
          </Button>
        )}
        {finding.status !== 'open' && (
          <Button variant="ghost" onClick={() => handleAction('open')} disabled={updateStatus.isPending}>
            Reopen
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk factors</CardTitle>
          <CardDescription>Evidence behind this finding&apos;s risk score of {finding.riskScore}.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {finding.factors.map((factor, i) => (
            <div key={i} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{factor.factor.replace(/_/g, ' ')}</span>
                <Badge variant="secondary">score {factor.score}</Badge>
              </div>
              <p className="mt-1 text-muted-foreground">{factor.evidence}</p>
              <p className="mt-1">{factor.recommendation}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {finding.vulnerabilities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Known vulnerabilities</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {finding.vulnerabilities.map((vuln) => (
              <div key={vuln.sourceId} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{vuln.sourceId}</span>
                  {vuln.cvssScore && <Badge variant="secondary">CVSS {vuln.cvssScore.toFixed(1)}</Badge>}
                </div>
                <p className="mt-1 text-muted-foreground">{vuln.summary}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {finding.dependencyPath.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dependency path</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-sm">{[...finding.dependencyPath, finding.packageName].join(' → ')}</code>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
