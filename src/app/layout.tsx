import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Sans, Red_Hat_Mono } from 'next/font/google';
import './globals.css';
import { AirquaProvider } from '@/context/AirquaContext';
import { AuthProvider } from '@/context/AuthContext';
import HeaderNav from '@/components/shared/HeaderNav';
import FooterBar from '@/components/shared/FooterBar';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const redHatMono = Red_Hat_Mono({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

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
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${dmSans.variable} ${redHatMono.variable}`}
    >
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
