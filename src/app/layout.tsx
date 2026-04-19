import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { I18nProvider } from '@/i18n/I18nProvider';
import { getMessages } from '@/i18n/messages';
import { DEFAULT_LOCALE } from '@/i18n/types';
import './globals.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: getMessages(DEFAULT_LOCALE).metadata.title,
  description: getMessages(DEFAULT_LOCALE).metadata.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={DEFAULT_LOCALE}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: 'light' }}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
