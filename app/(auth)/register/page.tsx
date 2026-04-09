import { RegisterForm } from '@/components/auth/register-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Crea il tuo account</CardTitle>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Hai già un account?{' '}
            <Link href="/login" className="underline hover:text-foreground">
              Accedi
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
