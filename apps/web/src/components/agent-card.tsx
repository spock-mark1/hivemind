'use client';

import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
  persona: string;
  twitterHandle: string;
  status: string;
  _count: { tweets: number; opinions: number };
}

interface Props {
  agent: Agent;
  onStatusChange: (id: string, status: string) => void;
}

export default function AgentCard({ agent, onStatusChange }: Props) {
  const statusColor = {
    RUNNING: 'bg-hive-bull',
    PAUSED: 'bg-hive-accent',
    IDLE: 'bg-gray-500',
    ERROR: 'bg-hive-bear',
  }[agent.status] || 'bg-gray-500';

  const personaColor = {
    'Bullish Maximalist': 'badge-bull',
    'Bear Analyst': 'badge-bear',
    'DeFi Degen': 'badge-neutral',
    'Macro Strategist': 'badge-neutral',
  }[agent.persona] || 'badge-neutral';

  return (
    <div className="card hover:border-hive-accent/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <Link href={`/agents/${agent.id}`} className="hover:text-hive-accent transition-colors">
          <h3 className="font-semibold">{agent.name}</h3>
          <p className="text-xs text-gray-400">@{agent.twitterHandle}</p>
        </Link>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${statusColor}`} />
          <span className="text-xs text-gray-400">{agent.status}</span>
        </div>
      </div>

      <span className={personaColor}>{agent.persona}</span>

      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
        <span>{agent._count?.tweets ?? 0} tweets</span>
        <span>{agent._count?.opinions ?? 0} opinions</span>
      </div>

      <div className="flex gap-2 mt-3">
        {agent.status !== 'RUNNING' && (
          <button
            onClick={() => onStatusChange(agent.id, 'RUNNING')}
            className="text-xs px-2 py-1 bg-hive-bull/20 text-hive-bull rounded hover:bg-hive-bull/30"
          >
            Start
          </button>
        )}
        {agent.status === 'RUNNING' && (
          <button
            onClick={() => onStatusChange(agent.id, 'PAUSED')}
            className="text-xs px-2 py-1 bg-hive-accent/20 text-hive-accent rounded hover:bg-hive-accent/30"
          >
            Pause
          </button>
        )}
        {agent.status !== 'IDLE' && (
          <button
            onClick={() => onStatusChange(agent.id, 'IDLE')}
            className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
}
