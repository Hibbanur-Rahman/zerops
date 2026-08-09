'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FolderGit2, Lock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { SecurityScore } from '@/components/security-score';
import { PaginationBar } from '@/components/pagination-bar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRepositories, useUpdateRepository } from '@/hooks/use-repositories';
import type { Repository } from '@/types/api';

function MonitoringToggle({ repo }: { repo: Repository }) {
  const { mutate, isPending } = useUpdateRepository(repo._id);
  return (
    <Switch
      checked={repo.monitoringEnabled}
      disabled={isPending}
      onCheckedChange={(checked) => mutate({ monitoringEnabled: checked })}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Toggle monitoring for ${repo.fullName}`}
    />
  );
}

export default function RepositoriesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useRepositories(page);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Repositories</h1>
        <p className="text-muted-foreground">Repositories available through your GitHub App installations.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : !data?.data.length ? (
        <EmptyState
          icon={FolderGit2}
          title="No repositories yet"
          description="Connect GitHub and install the app to see repositories here."
          action={
            <Link href="/settings/github" className="text-sm font-medium underline-offset-4 hover:underline">
              Go to GitHub settings
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Repository</TableHead>
                <TableHead>Security score</TableHead>
                <TableHead>Last scan</TableHead>
                <TableHead className="text-right">Monitoring</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((repo) => (
                <TableRow key={repo._id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/repositories/${repo._id}`} className="flex items-center gap-2 font-medium hover:underline">
                      {repo.private && <Lock className="size-3.5 text-muted-foreground" aria-label="Private repository" />}
                      {repo.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <SecurityScore score={repo.securityScore} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {repo.lastScanAt ? new Date(repo.lastScanAt).toLocaleString() : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <MonitoringToggle repo={repo} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationBar page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
