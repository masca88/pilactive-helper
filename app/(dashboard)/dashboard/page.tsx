import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Benvenuto, {session.user.name || session.user.email}!</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Hai effettuato l'accesso con successo.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Prossimo passo: Aggiungi le tue credenziali PilActive nelle <a href="/settings" className="underline">Impostazioni</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
