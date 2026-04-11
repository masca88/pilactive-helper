import { LogoutButton } from '@/components/auth/logout-button';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-semibold">
              PilActive Helper
            </Link>
            <nav className="flex gap-4">
              <Link
                href="/dashboard"
                className="text-sm hover:underline text-muted-foreground hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                href="/events"
                className="text-sm hover:underline text-muted-foreground hover:text-foreground"
              >
                Eventi
              </Link>
              <Link
                href="/bookings"
                className="text-sm hover:underline text-muted-foreground hover:text-foreground"
              >
                Prenotazioni
              </Link>
              <Link
                href="/settings"
                className="text-sm hover:underline text-muted-foreground hover:text-foreground"
              >
                Impostazioni
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session.user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
