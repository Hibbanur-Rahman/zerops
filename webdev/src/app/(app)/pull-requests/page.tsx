'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GitPullRequest } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { PaginationBar } from '@/components/pagination-bar';
import { usePullRequests } from '@/hooks/use-pull-requests';

export default function PullRequestsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePullRequests({ page });

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pull Requests</h1>
        <p className="text-muted-foreground">Pull requests analyzed across your monitored repositories.</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data?.data.length ? (
        <EmptyState icon={GitPullRequest} title="No pull requests yet" description="Analyzed pull requests will show up here." />
      ) : (
        <div className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pull request</TableHead>
                <TableHead>Repository</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Opened</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((pr) => {
                const repo = typeof pr.repositoryId === 'object' ? pr.repositoryId : undefined;
                return (
                  <TableRow key={pr._id}>
                    <TableCell>
                      <Link href={`/pull-requests/${pr._id}`} className="font-medium hover:underline">
                        #{pr.number} {pr.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{repo?.fullName ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{pr.authorLogin}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{pr.state}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{new Date(pr.openedAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <PaginationBar page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
