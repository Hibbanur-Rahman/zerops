'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ShieldAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { SeverityBadge } from '@/components/severity-badge';
import { PaginationBar } from '@/components/pagination-bar';
import { useFindings, useUpdateFindingStatus } from '@/hooks/use-findings';
import { ApiError } from '@/lib/api-client';
import type { RiskLevel } from '@/types/api';

const SEVERITIES: RiskLevel[] = ['CRITICAL', 'SEVERE', 'HIGH', 'MODERATE', 'LOW'];

export default function FindingsPage() {
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState<string>('all');
  const [status, setStatus] = useState<string>('open');

  const { data, isLoading } = useFindings({
    page,
    severity: severity === 'all' ? undefined : severity,
    status: status === 'all' ? undefined : status,
  });
  const updateStatus = useUpdateFindingStatus();

  function handleAction(id: string, next: 'resolved' | 'ignored') {
    updateStatus.mutate(
      { id, status: next },
      {
        onSuccess: () => toast.success(next === 'resolved' ? 'Marked resolved' : 'Finding ignored'),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Failed to update finding'),
      },
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Findings</h1>
        <p className="text-muted-foreground">Security and supply-chain findings across your repositories.</p>
      </div>

      <div className="flex gap-3">
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            {SEVERITIES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="ignored">Ignored</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data?.data.length ? (
        <EmptyState icon={ShieldAlert} title="No findings" description="Nothing matches these filters." />
      ) : (
        <div className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Repository</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((finding) => {
                const repo = typeof finding.repositoryId === 'object' ? finding.repositoryId : undefined;
                return (
                  <TableRow key={finding._id}>
                    <TableCell>
                      <Link href={`/findings/${finding._id}`} className="font-medium hover:underline">
                        {finding.packageName}@{finding.packageVersion}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {repo ? <Link href={`/repositories/${repo._id}`} className="hover:underline">{repo.fullName}</Link> : '—'}
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={finding.severity} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{finding.status}</TableCell>
                    <TableCell className="text-right">
                      {finding.status === 'open' && (
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleAction(finding._id, 'resolved')}>
                            Resolve
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleAction(finding._id, 'ignored')}>
                            Ignore
                          </Button>
                        </div>
                      )}
                    </TableCell>
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
