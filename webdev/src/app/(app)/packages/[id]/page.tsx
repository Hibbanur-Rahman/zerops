'use client';

import { use } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SeverityBadge } from '@/components/severity-badge';
import { EmptyState } from '@/components/empty-state';
import { useDependency } from '@/hooks/use-dependencies';

export default function PackageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useDependency(id);

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
        <EmptyState title="Package not found" />
      </div>
    );
  }

  const { dependency, versions, vulnerabilities } = data;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{dependency.name}</h1>
        <p className="text-muted-foreground">{dependency.description ?? 'No description available.'}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Latest version</CardDescription>
            <CardTitle className="text-xl">{dependency.latestVersion ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>License</CardDescription>
            <CardTitle className="text-xl">{dependency.license ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Maintainers</CardDescription>
            <CardTitle className="text-xl">{dependency.maintainersCount ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Weekly downloads</CardDescription>
            <CardTitle className="text-xl">{dependency.weeklyDownloads?.toLocaleString() ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {dependency.isDeprecated && (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm">
            <Badge variant="destructive" className="mb-2">
              Deprecated
            </Badge>
            <p>{dependency.deprecationMessage}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Known vulnerabilities</CardTitle>
        </CardHeader>
        <CardContent>
          {vulnerabilities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No known vulnerabilities on record for this package.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {vulnerabilities.map((vuln) => (
                <div key={vuln._id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{vuln.sourceId}</span>
                    <SeverityBadge severity={vuln.severity} />
                  </div>
                  <p className="mt-1 text-muted-foreground">{vuln.summary}</p>
                  {vuln.patchedVersion && <p className="mt-1">Patched in {vuln.patchedVersion}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Version history</CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No version history recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Install scripts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((v) => (
                  <TableRow key={v._id}>
                    <TableCell className="font-medium">{v.version}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>{v.hasInstallScripts && <Badge variant="outline">Has install scripts</Badge>}</TableCell>
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
