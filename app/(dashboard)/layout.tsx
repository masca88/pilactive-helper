import { LogoutButton } from '@/components/auth/logout-button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h2 className="text-xl font-semibold">PilActive Helper</h2>
          <LogoutButton />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
