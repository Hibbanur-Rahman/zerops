'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { useSession, useInvalidateSession } from '@/hooks/use-session';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/settings/github', label: 'GitHub' },
];

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
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-5 text-primary" aria-hidden />
            Package Risk Analyzer
          </div>
          <nav className="flex items-center gap-4">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user && <span className="text-sm text-muted-foreground">{user.name}</span>}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            Log out
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
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
