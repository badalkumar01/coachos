import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <p className="text-muted-foreground font-mono text-sm">404</p>
        <h1 className="mt-2 text-xl font-semibold">We could not find that page</h1>
        <p className="text-muted-foreground mt-2 text-sm text-pretty">
          The link may be out of date, or the record may have been deleted.
        </p>
        <Button render={<Link href="/dashboard" />} className="mt-6">
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
