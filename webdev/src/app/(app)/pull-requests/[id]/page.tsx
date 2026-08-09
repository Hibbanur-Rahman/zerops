'use client';

import { use } from 'react';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SeverityBadge } from '@/components/severity-badge';
import { EmptyState } from '@/components/empty-state';
import { usePullRequest } from '@/hooks/use-pull-requests';

export default function PullRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = usePullRequest(id);

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
        <EmptyState title="Pull request not found" />
      </div>
    );
  }

  const { pullRequest, findings } = data;
  const repo = typeof pullRequest.repositoryId === 'object' ? pullRequest.repositoryId : undefined;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            #{pullRequest.number} {pullRequest.title}
          </h1>
          <p className="text-muted-foreground">
            {repo?.fullName} · {pullRequest.authorLogin} · {pullRequest.headBranch} → {pullRequest.baseBranch}
          </p>
        </div>
        <Badge variant="outline">{pullRequest.state}</Badge>
      </div>

      {pullRequest.description && (
        <Card>
          <CardContent className="py-4 text-sm whitespace-pre-wrap">{pullRequest.description}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Findings ({findings.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {findings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No significant findings on the latest analysis.</p>
          ) : (
            findings.map((finding) => (
              <div key={finding._id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <span className="font-medium">
                  {finding.packageName}@{finding.packageVersion}
                </span>
                <SeverityBadge severity={finding.severity} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {repo && (
        <a
          href={`https://github.com/${repo.fullName}/pull/${pullRequest.number}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          View on GitHub <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  );
}
