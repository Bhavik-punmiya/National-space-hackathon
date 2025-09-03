import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Share_Tech_Mono } from 'next/font/google';
import './globals.css';
import Providers from '@/providers/Providers';
import ChatBotWrapper from '@/components/ChatBotWrapper';
import AuthProvider from '@/providers/AuthProvider';

const inter = Inter({ subsets: ['latin'] });
const spaceMono = Share_Tech_Mono({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-space'
});

export const metadata: Metadata = {
  title: 'ISS Inventory Management',
  description: 'Manage and track inventory on the International Space Station',
};



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.className} ${spaceMono.variable}`}>
        <Providers>
          <AuthProvider>
            {children}
          </AuthProvider>
        </Providers>
        <ChatBotWrapper />
      </body>
    </html>
  );
}
