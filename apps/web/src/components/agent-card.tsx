'use client';

import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
  persona: string;
  twitterHandle: string;
  status: string;
  lastHeartbeat?: string | null;
  updatedAt?: string;
  _count: { tweets: number; opinions: number };
}

interface Props {
  agent: Agent;
}

export default function AgentCard({ agent }: Props) {
  // Check if agent is online (heartbeat within last 2 minutes)
  const isOnline = agent.lastHeartbeat
    ? Date.now() - new Date(agent.lastHeartbeat).getTime() < 120000
    : false;

  const statusConfig = {
    RUNNING: { color: 'bg-green-500', label: 'Running' },
    PAUSED: { color: 'bg-yellow-500', label: 'Paused' },
    IDLE: { color: 'bg-gray-400', label: 'Idle' },
    ERROR: { color: 'bg-red-500', label: 'Error' },
  }[agent.status] || { color: 'bg-gray-400', label: agent.status };

  const personaColor = {
    'BULL': 'badge-bull',
    'Bullish Maximalist': 'badge-bull',
    'BEAR': 'badge-bear',
    'Bear Analyst': 'badge-bear',
    'DEGEN': 'badge-neutral',
    'DeFi Degen': 'badge-neutral',
    'MACRO': 'badge-neutral',
    'Macro Strategist': 'badge-neutral',
  }[agent.persona] || 'badge-neutral';

  const getLastSeen = () => {
    if (!agent.lastHeartbeat) return 'Never';
    const diff = Date.now() - new Date(agent.lastHeartbeat).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <Link href={`/agents/${agent.id}`} className="block">
      <div className="card hover:shadow-lg transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-base">{agent.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">@{agent.twitterHandle}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${statusConfig.color}`} />
              <span className="text-xs text-gray-600">{statusConfig.label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-xs text-gray-500">{isOnline ? 'Online' : getLastSeen()}</span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <span className={personaColor}>{agent.persona}</span>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{agent._count?.tweets ?? 0} tweets</span>
          <span>{agent._count?.opinions ?? 0} opinions</span>
        </div>
      </div>
    </Link>
  );
}
