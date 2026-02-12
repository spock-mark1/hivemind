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
  createdAt: string;
  _count: { tweets: number; opinions: number };
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', persona: '', strategy: '', twitterHandle: '' });

  useEffect(() => {
    api.getAgents()
      .then(setAgents)
      .catch((err) => console.error('Failed to load agents:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const agent = await api.createAgent(form);
      setAgents((prev) => [agent, ...prev]);
      setForm({ name: '', persona: '', strategy: '', twitterHandle: '' });
      setShowCreate(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.updateAgentStatus(id, status);
      setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">AI Agents</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-hive-accent text-black rounded-lg text-sm font-semibold hover:bg-hive-accent/90 transition"
        >
          + New Agent
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="agent-name" className="block text-xs text-gray-400 mb-1">Agent Name</label>
              <input
                id="agent-name"
                placeholder="e.g. Alpha Bot"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-hive-bg border border-hive-border rounded-lg px-3 py-2 text-sm"
                required
                maxLength={100}
              />
            </div>
            <div>
              <label htmlFor="twitter-handle" className="block text-xs text-gray-400 mb-1">Twitter Handle</label>
              <input
                id="twitter-handle"
                placeholder="without @"
                value={form.twitterHandle}
                onChange={(e) => setForm({ ...form, twitterHandle: e.target.value.replace(/^@/, '') })}
                className="w-full bg-hive-bg border border-hive-border rounded-lg px-3 py-2 text-sm"
                required
                maxLength={50}
              />
            </div>
            <div>
              <label htmlFor="persona" className="block text-xs text-gray-400 mb-1">Persona</label>
              <select
                id="persona"
                value={form.persona}
                onChange={(e) => setForm({ ...form, persona: e.target.value })}
                className="w-full bg-hive-bg border border-hive-border rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="">Select Persona</option>
                <option value="Bullish Maximalist">Bullish Maximalist</option>
                <option value="Bear Analyst">Bear Analyst</option>
                <option value="DeFi Degen">DeFi Degen</option>
                <option value="Macro Strategist">Macro Strategist</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="strategy" className="block text-xs text-gray-400 mb-1">Investment Strategy</label>
            <textarea
              id="strategy"
              placeholder="Detailed prompt for the AI agent..."
              value={form.strategy}
              onChange={(e) => setForm({ ...form, strategy: e.target.value })}
              className="w-full bg-hive-bg border border-hive-border rounded-lg px-3 py-2 text-sm h-24"
              required
              maxLength={5000}
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-hive-accent text-black rounded-lg text-sm font-semibold">
            Create Agent
          </button>
        </form>
      )}

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} onStatusChange={handleStatusChange} />
        ))}
        {loading && (
          <p className="text-gray-500 col-span-full text-center py-12">Loading agents...</p>
        )}
        {!loading && agents.length === 0 && (
          <p className="text-gray-500 col-span-full text-center py-12">
            No agents yet. Create your first AI agent to get started.
          </p>
        )}
      </div>
    </div>
  );
}
