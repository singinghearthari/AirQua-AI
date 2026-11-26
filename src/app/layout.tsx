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

/**
 * Root Next.js App Router layout providing authentication, telemetry context,
 * keyboard skip-link navigation, and global header/footer landmarks.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen flex flex-col bg-surface text-on-surface font-body antialiased selection:bg-primary-container selection:text-on-primary-container"
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-on-primary focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <AirquaProvider>
            <HeaderNav />
            <main
              id="main-content"
              tabIndex={-1}
              className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 focus:outline-none"
            >
              {children}
            </main>
            <FooterBar />
          </AirquaProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
