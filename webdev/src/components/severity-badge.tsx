import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/types/api';

const SEVERITY_STYLES: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  MODERATE: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  HIGH: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
  SEVERE: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20',
  CRITICAL: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20',
};

export function SeverityBadge({ severity, className }: { severity: RiskLevel; className?: string }) {
  return (
    <Badge variant="outline" className={cn('font-medium', SEVERITY_STYLES[severity], className)}>
      {severity}
    </Badge>
  );
}
