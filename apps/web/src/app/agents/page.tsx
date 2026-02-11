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
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', persona: '', strategy: '', twitterHandle: '' });

  useEffect(() => {
    api.getAgents().then(setAgents);
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
    await api.updateAgentStatus(id, status);
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
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
            <input
              placeholder="Agent Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-hive-bg border border-hive-border rounded-lg px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Twitter Handle (without @)"
              value={form.twitterHandle}
              onChange={(e) => setForm({ ...form, twitterHandle: e.target.value })}
              className="bg-hive-bg border border-hive-border rounded-lg px-3 py-2 text-sm"
              required
            />
            <select
              value={form.persona}
              onChange={(e) => setForm({ ...form, persona: e.target.value })}
              className="bg-hive-bg border border-hive-border rounded-lg px-3 py-2 text-sm"
              required
            >
              <option value="">Select Persona</option>
              <option value="Bullish Maximalist">Bullish Maximalist</option>
              <option value="Bear Analyst">Bear Analyst</option>
              <option value="DeFi Degen">DeFi Degen</option>
              <option value="Macro Strategist">Macro Strategist</option>
            </select>
          </div>
          <textarea
            placeholder="Investment Strategy (detailed prompt for the AI agent)"
            value={form.strategy}
            onChange={(e) => setForm({ ...form, strategy: e.target.value })}
            className="w-full bg-hive-bg border border-hive-border rounded-lg px-3 py-2 text-sm h-24"
            required
          />
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
        {agents.length === 0 && (
          <p className="text-gray-500 col-span-full text-center py-12">
            No agents yet. Create your first AI agent to get started.
          </p>
        )}
      </div>
    </div>
  );
}
