import Link from 'next/link';
import { Bell, GitPullRequest } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const SETTINGS_LINKS = [
  {
    href: '/settings/github',
    icon: GitPullRequest,
    title: 'GitHub',
    description: 'Connect your account and manage GitHub App installations.',
  },
  {
    href: '/settings/notifications',
    icon: Bell,
    title: 'Notifications',
    description: 'Choose when Package Risk Analyzer emails you.',
  },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account, GitHub connection, and notification preferences.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SETTINGS_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <link.icon className="mb-2 size-5 text-primary" aria-hidden />
                <CardTitle className="text-base">{link.title}</CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
