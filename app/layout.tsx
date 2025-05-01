import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import Navbar from '@/components/Navbar';
import { Analytics } from "@vercel/analytics/react";
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Brevity AI',
  description: 'Generate and Publish blogs using AI',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) 

{
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className + " bg-[#E6E6FA] dark:bg-[#1E1E2F] text-[#000000] dark:text-[#FFFFFF]"}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar />
          <Analytics />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}