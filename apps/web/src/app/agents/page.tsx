'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import AgentCard from '@/components/agent-card';

interface Agent {
  id: string;
  name: string;
  persona: string;
  strategy: string;
  twitterHandle: string;
  status: string;
  lastHeartbeat?: string | null;
  updatedAt?: string;
  createdAt: string;
  _count: { tweets: number; opinions: number };
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAgents = () => {
      api.getAgents()
        .then(setAgents)
        .catch((err) => console.error('Failed to load agents:', err))
        .finally(() => setLoading(false));
    };

    // Initial load
    loadAgents();

    // Refresh every 10 seconds to update online status
    const interval = setInterval(loadAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  // Calculate online/offline stats
  const onlineCount = agents.filter((a) => {
    if (!a.lastHeartbeat) return false;
    return Date.now() - new Date(a.lastHeartbeat).getTime() < 120000;
  }).length;

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Agents</h1>
          <p className="text-sm text-gray-600 mt-2">
            All registered agents across the network
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-gray-600">{onlineCount} Online</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            <span className="text-gray-600">{agents.length - onlineCount} Offline</span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="card mb-8 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🐝</span>
          <div>
            <h3 className="font-semibold text-sm mb-1">Distributed Agent Network</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Agents are run by developers on their own machines and automatically register with this Hub.
              To run your own agent, see the{' '}
              <a
                href="https://github.com/yourusername/hivemind/blob/main/apps/agent-node/README.md"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-amber-800"
              >
                Agent Node documentation
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
        {loading && (
          <p className="text-gray-500 col-span-full text-center py-16">Loading agents...</p>
        )}
        {!loading && agents.length === 0 && (
          <div className="col-span-full text-center py-16">
            <p className="text-gray-500 mb-4">No agents registered yet.</p>
            <p className="text-sm text-gray-400">
              Run an Agent Node to register your first agent.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
