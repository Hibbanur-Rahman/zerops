'use client';

import { useId, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert, TableIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RiskDistributionData {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

// Fixed status palette (good/warning/serious/critical) — never themed, reserved
// for state. Verified with the data-viz skill's validator: adjacent CVD clears
// the target (worst pair ΔE 11.3) and all four clear 3:1 on the dark surface;
// warning/serious sit under 3:1 on the light surface by design, mitigated by
// pairing every mark with an icon + a plain-text-ink label, never color alone.
const ROWS: Array<{
  key: keyof RiskDistributionData;
  label: string;
  icon: typeof ShieldAlert;
  color: string;
}> = [
  { key: 'critical', label: 'Critical', icon: ShieldAlert, color: '#d03b3b' },
  { key: 'high', label: 'High', icon: AlertTriangle, color: '#ec835a' },
  { key: 'medium', label: 'Medium', icon: AlertCircle, color: '#fab219' },
  { key: 'low', label: 'Low', icon: CheckCircle2, color: '#0ca30c' },
];

export function RiskDistributionChart({ data }: { data: RiskDistributionData }) {
  const [showTable, setShowTable] = useState(false);
  const labelId = useId();
  const total = data.critical + data.high + data.medium + data.low;
  const max = Math.max(1, data.critical, data.high, data.medium, data.low);

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">No open findings — nothing to show yet.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p id={labelId} className="text-sm text-muted-foreground">
          {total.toLocaleString()} open finding{total === 1 ? '' : 's'}
        </p>
        <Button variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)}>
          <TableIcon className="size-4" />
          {showTable ? 'Show chart' : 'Show table'}
        </Button>
      </div>

      {showTable ? (
        <Table aria-labelledby={labelId}>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead className="text-right">Findings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-right tabular-nums">{data[row.key].toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="flex flex-col gap-3" role="group" aria-labelledby={labelId}>
          {ROWS.map((row) => {
            const count = data[row.key];
            const widthPct = Math.max((count / max) * 100, count > 0 ? 3 : 0);
            const description = `${row.label}: ${count.toLocaleString()} finding${count === 1 ? '' : 's'}`;
            return (
              <div key={row.key} className="flex items-center gap-3">
                <div className="flex w-20 shrink-0 items-center gap-1.5 text-sm font-medium">
                  <row.icon className="size-3.5" style={{ color: row.color }} aria-hidden />
                  {row.label}
                </div>
                <div
                  className="relative h-4 flex-1 rounded-r-[4px] bg-muted/40"
                  tabIndex={0}
                  role="img"
                  aria-label={description}
                  title={description}
                >
                  {count > 0 && (
                    <div
                      className="h-full rounded-r-[4px] transition-[width]"
                      style={{ width: `${widthPct}%`, backgroundColor: row.color }}
                    />
                  )}
                </div>
                <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums">
                  {count.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
