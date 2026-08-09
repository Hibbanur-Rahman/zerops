'use client';

import { use } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SeverityBadge } from '@/components/severity-badge';
import { SecurityScore } from '@/components/security-score';
import { EmptyState } from '@/components/empty-state';
import { useAnalysis } from '@/hooks/use-analyses';
import { ShieldCheck } from 'lucide-react';

export default function AnalysisDetailPage({ params }: { params: Promise<{ id: string; analysisId: string }> }) {
  const { analysisId } = use(params);
  const { data, isLoading } = useAnalysis(analysisId);

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
        <EmptyState title="Analysis not found" />
      </div>
    );
  }

  const { analysis, packages, findings } = data;
  const s = analysis.summary;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {analysis.analysisType === 'pull_request' ? `Pull Request #${analysis.pullRequestNumber}` : 'Analysis'}
          </h1>
          <p className="text-muted-foreground">
            Commit <code className="rounded bg-muted px-1">{(analysis.headSha ?? analysis.commitSha ?? '').slice(0, 7)}</code>
            {' · '}
            {new Date(analysis.createdAt).toLocaleString()}
          </p>
        </div>
        {analysis.overallRisk && <SeverityBadge severity={analysis.overallRisk} className="text-sm" />}
      </div>

      {analysis.status !== 'completed' && (
        <Card>
          <CardContent className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 animate-pulse" />
            Analysis is {analysis.status}
            {analysis.error && <span className="text-destructive"> — {analysis.error}</span>}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Security score</CardDescription>
            <CardTitle className="text-2xl">
              <SecurityScore score={analysis.securityScore} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Packages analyzed</CardDescription>
            <CardTitle className="text-2xl">{s?.totalDependencies ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>New dependencies</CardDescription>
            <CardTitle className="text-2xl">{s?.newDependencies ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vulnerabilities</CardDescription>
            <CardTitle className="text-2xl">{s?.vulnerabilities ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="findings">
        <TabsList>
          <TabsTrigger value="findings">Findings ({findings.length})</TabsTrigger>
          <TabsTrigger value="packages">All packages ({packages.length})</TabsTrigger>
          <TabsTrigger value="providers">Data sources</TabsTrigger>
        </TabsList>

        <TabsContent value="findings" className="flex flex-col gap-4">
          {findings.length === 0 ? (
            <EmptyState title="No significant findings" description="Nothing here needs your attention." />
          ) : (
            findings.map((finding) => (
              <Card key={finding._id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="text-base">
                      {finding.packageName}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">{finding.packageVersion}</span>
                    </CardTitle>
                    <CardDescription>
                      {finding.dependencyType === 'direct' ? 'Direct dependency' : `Transitive via ${finding.dependencyPath.join(' → ')}`}
                    </CardDescription>
                  </div>
                  <SeverityBadge severity={finding.severity} />
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {finding.factors.map((factor, i) => (
                    <div key={i} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{factor.factor.replace(/_/g, ' ')}</span>
                        <Badge variant="secondary">score {factor.score}</Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">{factor.evidence}</p>
                      <p className="mt-1 text-foreground">{factor.recommendation}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="packages">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg._id}>
                  <TableCell className="font-medium">{pkg.name}</TableCell>
                  <TableCell>
                    {pkg.previousVersion ? `${pkg.previousVersion} → ${pkg.version}` : pkg.version}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{pkg.changeType}</TableCell>
                  <TableCell className="text-muted-foreground">{pkg.isDirect ? 'Direct' : 'Transitive'}</TableCell>
                  <TableCell>
                    <SeverityBadge severity={pkg.riskLevel} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="providers">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Checked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(analysis.providerStatus ?? []).map((p) => (
                <TableRow key={p.provider}>
                  <TableCell className="font-medium">{p.provider}</TableCell>
                  <TableCell>
                    <Badge variant={p.available ? 'secondary' : 'destructive'}>{p.available ? 'Available' : 'Unavailable'}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(p.checkedAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
