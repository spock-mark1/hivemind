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
    <html lang="en" className="dark">
      <body className={inter.className}>
        <nav className="fixed top-0 z-50 w-full border-b border-hive-border bg-hive-bg/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              <span className="text-hive-accent">SelaNet</span>
              <span className="text-gray-400">Hive</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/agents" className="text-sm text-gray-400 hover:text-white transition-colors">
                Agents
              </Link>
              <Link href="/consensus" className="text-sm text-gray-400 hover:text-white transition-colors">
                Consensus
              </Link>
            </div>
          </div>
        </nav>
        <main className="pt-14">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </body>
    </html>
  );
}
