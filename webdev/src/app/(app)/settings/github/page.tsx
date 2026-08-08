'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { GitPullRequest, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { API_URL } from '@/lib/config';
import { useGithubRepositories, useGithubStatus } from '@/hooks/use-github-status';

export default function GithubSettingsPage() {
  const searchParams = useSearchParams();
  const { data: status, isLoading } = useGithubStatus();
  const { data: repositories } = useGithubRepositories(Boolean(status?.installations.length));

  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      toast.success('GitHub account connected');
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">GitHub</h1>
        <p className="text-muted-foreground">Connect your account and install the GitHub App to start monitoring.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitPullRequest className="size-5" aria-hidden />
            GitHub account
          </CardTitle>
          <CardDescription>
            {status?.connected
              ? 'Used to identify pull request and commit authors.'
              : 'Connect your GitHub account so we can identify pull request and commit authors.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status?.connected ? (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
              Connected as <span className="font-medium">{status.githubUsername}</span>
            </div>
          ) : (
            <Button asChild>
              <a href={`${API_URL}/api/v1/github/connect`}>Connect GitHub</a>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GitHub App installation</CardTitle>
          <CardDescription>
            Install the Package Risk Analyzer GitHub App on the repositories you want monitored.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {status?.installations.length ? (
            <ul className="flex flex-col gap-2">
              {status.installations.map((installation) => (
                <li key={installation.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span className="font-medium">{installation.accountLogin}</span>
                  <Badge variant="secondary">{installation.repositorySelection === 'all' ? 'All repositories' : 'Selected repositories'}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No installations yet.</p>
          )}
          <Button variant="outline" className="self-start" asChild disabled={!status?.connected}>
            <a href={`${API_URL}/api/v1/github/install`}>Install GitHub App</a>
          </Button>
        </CardContent>
      </Card>

      {repositories && repositories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Repositories</CardTitle>
            <CardDescription>Repositories available through your GitHub App installations.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y">
              {repositories.map((repo) => (
                <li key={repo._id} className="flex items-center justify-between py-2 text-sm">
                  <span>{repo.fullName}</span>
                  <Badge variant={repo.private ? 'secondary' : 'outline'}>{repo.private ? 'Private' : 'Public'}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
