import Link from 'next/link';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-14 items-center px-6">
        <Link href="/" className="font-semibold tracking-tight">
          CoachOS
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
