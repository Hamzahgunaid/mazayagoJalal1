// src/app/layout.tsx
import './globals.css';
import SiteHeader from '@/components/layout/SiteHeader';
import { Footer } from '@/components/Footer';
import { Plus_Jakarta_Sans, Tajawal } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { ReactNode } from 'react';
import { headers } from 'next/headers';
import { getMessages, getRequestLocale } from '@/i18n/config';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', weight: ['400', '500', '600', '700', '800'] });
const tajawal = Tajawal({ subsets: ['arabic'], variable: '--font-tajawal', weight: ['300', '400', '500', '700'] });

export const metadata = {
  title: 'MazayaGo',
  description: 'MazayaGo - Launch immersive offers, rewards, and interactive experiences.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = getRequestLocale();
  const messages = await getMessages(locale);
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const isAdminShell = headers().get('x-admin-shell') === '1';

  return (
    <html lang={locale} dir={dir}>
      <body className={`${jakarta.variable} ${tajawal.variable} ${jakarta.className} ${tajawal.className} min-h-screen site-gradient bg-bg text-text antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {!isAdminShell && <SiteHeader />}
          <main className={isAdminShell ? "w-full p-0" : "mx-auto max-w-7xl p-4"}>{children}</main>
          {!isAdminShell && <Footer />}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
