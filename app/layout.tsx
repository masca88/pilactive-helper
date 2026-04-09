import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PilActive Helper',
  description: 'Automated gym class booking system for PilActive Sesto San Giovanni',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
