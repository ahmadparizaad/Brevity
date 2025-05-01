import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import Navbar from '@/components/Navbar';
import favicon from '@/public/favicon.ico';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Blog Generator',
  description: 'Generate blogs using Gemini AI',
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
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}