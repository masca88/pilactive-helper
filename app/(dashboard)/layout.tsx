import { LogoutButton } from '@/components/auth/logout-button';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

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
            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-accent hover:text-accent-foreground">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Menu</span>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-4 mt-6">
                  <Link
                    href="/dashboard"
                    className="text-base hover:underline text-muted-foreground hover:text-foreground px-2 py-1"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/events"
                    className="text-base hover:underline text-muted-foreground hover:text-foreground px-2 py-1"
                  >
                    Eventi
                  </Link>
                  <Link
                    href="/bookings"
                    className="text-base hover:underline text-muted-foreground hover:text-foreground px-2 py-1"
                  >
                    Prenotazioni
                  </Link>
                  <Link
                    href="/settings"
                    className="text-base hover:underline text-muted-foreground hover:text-foreground px-2 py-1"
                  >
                    Impostazioni
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>

            <Link href="/dashboard" className="text-xl font-semibold">
              PilActive Helper
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden md:flex gap-4">
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
            <span className="hidden md:block text-sm text-muted-foreground">
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
