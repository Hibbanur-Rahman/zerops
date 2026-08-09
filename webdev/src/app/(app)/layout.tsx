'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { LayoutDashboard, FolderGit2, GitPullRequest, ShieldAlert, Package, Settings, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/theme-toggle';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useSession, useInvalidateSession } from '@/hooks/use-session';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/repositories', label: 'Repositories', icon: FolderGit2 },
  { href: '/pull-requests', label: 'Pull Requests', icon: GitPullRequest },
  { href: '/findings', label: 'Findings', icon: ShieldAlert },
  { href: '/packages', label: 'Packages', icon: Package },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 flex-col border-r bg-muted/30 sm:flex">
      <div className="flex items-center gap-2 px-4 py-4 text-sm font-semibold">
        <ShieldCheck className="size-5 text-primary" aria-hidden />
        Package Risk Analyzer
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                active ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <link.icon className="size-4" aria-hidden />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user } = useSession();
  const invalidateSession = useInvalidateSession();

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.post('/api/v1/auth/logout'),
    onSuccess: async () => {
      await invalidateSession();
      router.push('/login');
    },
  });

  return (
    <div className="flex min-h-full flex-1">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b px-6 py-3">
          <ThemeToggle />
          {user && <span className="text-sm text-muted-foreground">{user.name}</span>}
          <Button variant="ghost" size="sm" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
            Log out
          </Button>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading, isUnauthenticated } = useSession();

  useEffect(() => {
    if (isUnauthenticated) {
      router.replace('/login');
    }
  }, [isUnauthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
