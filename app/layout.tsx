import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import ServiceWorkerRegister from '@/components/service-worker-register';
import OfflineBanner from '@/components/offline-banner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'OrganizApp2 — Tu trabajo en orden',
    template: '%s | OrganizApp2',
  },
  description:
    'Organiza, asigna y completa tus actividades en un solo lugar.',
  applicationName: 'OrganizApp2',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OrganizApp2',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ServiceWorkerRegister />
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}