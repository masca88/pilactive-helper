import { LoginForm } from '@/components/auth/login-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accedi a PilActive Helper</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Non hai un account?{' '}
            <Link href="/register" className="underline hover:text-foreground">
              Registrati
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
