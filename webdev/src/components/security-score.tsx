import { cn } from '@/lib/utils';

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export function SecurityScore({ score, className }: { score: number | null | undefined; className?: string }) {
  if (score === null || score === undefined) {
    return <span className={cn('text-muted-foreground', className)}>Not scanned yet</span>;
  }
  return (
    <span className={cn('font-semibold', scoreColor(score), className)}>
      {score}
      <span className="text-muted-foreground font-normal">/100</span>
    </span>
  );
}
