'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { PaginationBar } from '@/components/pagination-bar';
import { useDependencies } from '@/hooks/use-dependencies';

export default function PackagesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useDependencies(search, page);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Packages</h1>
        <p className="text-muted-foreground">Every dependency observed across your analyzed repositories.</p>
      </div>

      <Input
        placeholder="Search packages…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="max-w-sm"
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data?.data.length ? (
        <EmptyState icon={Package} title="No packages found" description="Run a scan on a repository to populate this list." />
      ) : (
        <div className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Latest version</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Weekly downloads</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((dep) => (
                <TableRow key={dep._id}>
                  <TableCell>
                    <Link href={`/packages/${dep._id}`} className="font-medium hover:underline">
                      {dep.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{dep.latestVersion ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{dep.license ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {dep.weeklyDownloads?.toLocaleString() ?? '—'}
                  </TableCell>
                  <TableCell>{dep.isDeprecated && <Badge variant="destructive">Deprecated</Badge>}</TableCell>
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
