'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="min-h-[200px] flex flex-col items-center justify-center gap-3 p-6">
          <p className="text-hive-bear font-semibold">Something went wrong</p>
          <p className="text-sm text-gray-400">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs px-3 py-1.5 bg-hive-accent/20 text-hive-accent rounded-lg hover:bg-hive-accent/30"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
