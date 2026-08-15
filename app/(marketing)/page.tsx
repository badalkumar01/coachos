import Link from 'next/link';
import { CalendarDays, CreditCard, Plug, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';

const features = [
  {
    icon: Users,
    title: 'One record per client',
    body: 'Profile, sessions, notes, payments and forms in a single timeline — not spread across six tools.',
  },
  {
    icon: CalendarDays,
    title: 'Booking that syncs',
    body: 'A branded booking page, availability rules and two-way calendar sync, with a video link created for you.',
  },
  {
    icon: CreditCard,
    title: 'Get paid directly',
    body: 'Connect your own Stripe account. Money goes to you — we are never the merchant of record.',
  },
  {
    icon: Plug,
    title: 'Bring your own tools',
    body: 'Already on Calendly and Zoom? Keep them. Everything still lands in the same timeline.',
  },
  {
    icon: Sparkles,
    title: 'AI that does the admin',
    body: 'Session notes from transcripts, prep briefs before every call, follow-ups drafted for you.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-14 items-center justify-between px-6">
        <span className="font-semibold tracking-tight">CoachOS</span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button render={<Link href="/sign-in" />} variant="ghost" size="sm">
            Sign in
          </Button>
          <Button render={<Link href="/sign-up" />} size="sm">
            Get started
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Run your whole coaching practice in one place.
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-lg text-pretty">
            Clients, sessions, notes, scheduling and payments — connected around the relationship,
            not a sales pipeline. Keep the tools you already like.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button render={<Link href="/sign-up" />} size="lg">
              Start free
            </Button>
            <Button render={<Link href="/sign-in" />} size="lg" variant="outline">
              Sign in
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-lg border p-5">
                <feature.icon className="text-muted-foreground size-5" />
                <h2 className="mt-3 text-base font-semibold">{feature.title}</h2>
                <p className="text-muted-foreground mt-1.5 text-sm text-pretty">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="text-muted-foreground border-t px-6 py-6 text-sm">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>CoachOS</span>
          <span>Built for coaches and consultants.</span>
        </div>
      </footer>
    </div>
  );
}
