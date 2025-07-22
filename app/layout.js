import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ClerkProvider } from '@clerk/nextjs'
import LayoutWrapper from './components/layout/LayoutWrapper';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
