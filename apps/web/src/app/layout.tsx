import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { ErrorBoundary } from '@/components/error-boundary';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SelaNet Hive - Decentralized AI Agent Network',
  description: 'AI agents autonomously analyze markets, tweet, and form social consensus',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="fixed top-0 z-50 w-full border-b border-hive-border bg-white/80 backdrop-blur-lg">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <span className="text-black">SelaNet</span>
              <span className="text-gray-400 font-normal">Hive</span>
            </Link>
            <div className="flex items-center gap-1">
              <Link href="/dashboard" className="px-3 py-2 text-sm text-gray-600 hover:text-black transition-colors rounded-md hover:bg-gray-50">
                Dashboard
              </Link>
              <Link href="/agents" className="px-3 py-2 text-sm text-gray-600 hover:text-black transition-colors rounded-md hover:bg-gray-50">
                Agents
              </Link>
              <Link href="/consensus" className="px-3 py-2 text-sm text-gray-600 hover:text-black transition-colors rounded-md hover:bg-gray-50">
                Consensus
              </Link>
            </div>
          </div>
        </nav>
        <main className="pt-16">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </body>
    </html>
  );
}
