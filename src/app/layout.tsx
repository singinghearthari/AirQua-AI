import type { Metadata } from 'next';
import './globals.css';
import { AirquaProvider } from '@/context/AirquaContext';
import { AuthProvider } from '@/context/AuthContext';
import HeaderNav from '@/components/shared/HeaderNav';
import FooterBar from '@/components/shared/FooterBar';

export const metadata: Metadata = {
  title: 'AIRQUA AI — Hyperlocal Air Quality & Persona Intelligence',
  description:
    'Real-time pan-India air-quality intelligence, 24-hour safe ventilation windows, Household Persona routines, multimodal Room & Smog Scan, and What-If Simulator (PromptWars Challenge 6).',
  icons: {
    icon: '/logo.jpeg',
    shortcut: '/logo.jpeg',
    apple: '/logo.jpeg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Red+Hat+Mono:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen flex flex-col bg-surface text-on-surface font-body antialiased selection:bg-primary-container selection:text-on-primary-container"
      >
        <AuthProvider>
          <AirquaProvider>
            <HeaderNav />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
              {children}
            </main>
            <FooterBar />
          </AirquaProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
