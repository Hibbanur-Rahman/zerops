import Link from "next/link";
import { ShieldCheck, GitPullRequest, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FEATURES = [
  {
    icon: PackageSearch,
    title: "Dependency intelligence",
    description:
      "Every push and pull request is parsed down to the manifest and lockfile level, across direct and transitive dependencies.",
  },
  {
    icon: ShieldCheck,
    title: "Real security intelligence",
    description:
      "Findings are backed by OSV.dev, the GitHub Advisory Database, and npm registry metadata — not a guess.",
  },
  {
    icon: GitPullRequest,
    title: "Right where you work",
    description:
      "Risk reports land as a pull request comment and check run, with an email to the author when it matters.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4 sm:px-10">
        <span className="text-sm font-semibold tracking-tight">
          Package Risk Analyzer
        </span>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-16 px-6 py-16 text-center sm:px-10">
        <div className="flex max-w-2xl flex-col items-center gap-6">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Know what a dependency change actually costs you.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Package Risk Analyzer watches your GitHub repositories, scores
            every dependency change for supply-chain risk, and reports back
            before it merges.
          </p>
          <div className="flex gap-3">
            <Button size="lg" asChild>
              <Link href="/register">Connect GitHub</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>

        <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="text-left">
              <CardHeader>
                <feature.icon
                  className="mb-2 size-6 text-primary"
                  aria-hidden
                />
                <CardTitle className="text-base">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground sm:px-10">
        Package Risk Analyzer — supply-chain risk analysis for GitHub repositories.
      </footer>
    </div>
  );
}
