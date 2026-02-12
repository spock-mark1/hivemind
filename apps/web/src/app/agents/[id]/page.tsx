'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { sentimentLabel } from '@selanet/shared';

interface TweetItem {
  id: string;
  content: string;
  type: string;
  tweetId?: string | null;
  sentiment?: number | null;
  postedAt: string;
}

interface OpinionItem {
  id: string;
  token: string;
  stance: number;
  confidence: number;
  reasoning: string;
  createdAt: string;
}

interface AgentDetail {
  id: string;
  name: string;
  persona: string;
  strategy: string;
  twitterHandle: string;
  status: string;
  sessionData?: boolean | null;
  createdAt: string;
  tweets: TweetItem[];
  opinions: OpinionItem[];
}

export default function AgentDetailPage() {
  const params = useParams();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'none' | 'active' | 'uploading' | 'error'>('none');
  const [sessionError, setSessionError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (params.id) {
      api.getAgent(params.id as string).then((data) => {
        setAgent(data);
        setSessionStatus(data.sessionData ? 'active' : 'none');
      }).catch((err) => {
        console.error('Failed to load agent:', err);
        setLoadError(true);
      });
    }
  }, [params.id]);

  const MAX_SESSION_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleSessionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !agent) return;

    if (file.size > MAX_SESSION_FILE_SIZE) {
      setSessionError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 5MB.`);
      setSessionStatus('error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSessionStatus('uploading');
    setSessionError('');

    try {
      const text = await file.text();
      // Validate it's valid JSON (Playwright storageState format)
      JSON.parse(text);
      await api.uploadSession(agent.id, text);
      setSessionStatus('active');
    } catch (err: any) {
      setSessionError(err.message || 'Failed to upload session');
      setSessionStatus('error');
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSessionDelete = async () => {
    if (!agent) return;
    try {
      await api.deleteSession(agent.id);
      setSessionStatus('none');
    } catch (err: any) {
      setSessionError(err.message);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!agent) return;
    try {
      await api.updateAgentStatus(agent.id, status);
      setAgent({ ...agent, status });
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-3">
        <p className="text-hive-bear font-semibold">Failed to load agent</p>
        <a href="/agents" className="text-sm text-hive-accent hover:underline">Back to Agents</a>
      </div>
    );
  }

  if (!agent) {
    return <div className="min-h-screen p-6 flex items-center justify-center text-gray-400">Loading...</div>;
  }

  const statusColor = {
    RUNNING: 'bg-hive-bull',
    PAUSED: 'bg-hive-accent',
    IDLE: 'bg-gray-500',
    ERROR: 'bg-hive-bear',
  }[agent.status] || 'bg-gray-500';

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-5xl mx-auto">
      {/* Agent Header */}
      <div className="card mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            <p className="text-sm text-gray-400 mt-1">@{agent.twitterHandle}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${statusColor}`} />
              <span className="text-sm text-gray-300">{agent.status}</span>
            </div>
            <div className="flex gap-2">
              {agent.status !== 'RUNNING' && (
                <button
                  onClick={() => handleStatusChange('RUNNING')}
                  className="text-xs px-3 py-1.5 bg-hive-bull/20 text-hive-bull rounded-lg hover:bg-hive-bull/30"
                >
                  Start
                </button>
              )}
              {agent.status === 'RUNNING' && (
                <button
                  onClick={() => handleStatusChange('PAUSED')}
                  className="text-xs px-3 py-1.5 bg-hive-accent/20 text-hive-accent rounded-lg hover:bg-hive-accent/30"
                >
                  Pause
                </button>
              )}
              {agent.status !== 'IDLE' && (
                <button
                  onClick={() => handleStatusChange('IDLE')}
                  className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
                >
                  Stop
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Persona</p>
            <p className="text-sm">{agent.persona}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Strategy</p>
            <p className="text-sm text-gray-300">{agent.strategy}</p>
          </div>
        </div>
      </div>

      {/* Twitter Session Management */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Twitter Session</h2>

        {sessionStatus === 'active' ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-hive-bull" />
              <span className="text-sm text-hive-bull">Session active</span>
              <span className="text-xs text-gray-500">— Agent can post tweets to @{agent.twitterHandle}</span>
            </div>
            <div className="flex gap-2">
              <label className="text-xs px-3 py-1.5 bg-hive-neutral/20 text-hive-neutral rounded-lg hover:bg-hive-neutral/30 cursor-pointer">
                Replace
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleSessionUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleSessionDelete}
                className="text-xs px-3 py-1.5 bg-hive-bear/20 text-hive-bear rounded-lg hover:bg-hive-bear/30"
              >
                Remove Session
              </button>
            </div>
          </div>
        ) : sessionStatus === 'uploading' ? (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-hive-accent animate-pulse" />
            <span className="text-sm text-gray-400">Uploading session...</span>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-400 mb-3">
              Upload a Playwright <code className="text-xs bg-hive-bg px-1 py-0.5 rounded">storageState.json</code> file
              to enable this agent to post tweets. Without a session, tweets will be saved as drafts only.
            </p>
            <div className="flex items-center gap-3">
              <label className="px-4 py-2 bg-hive-accent text-black text-sm font-semibold rounded-lg hover:bg-hive-accent/90 cursor-pointer transition">
                Upload Session File
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleSessionUpload}
                  className="hidden"
                />
              </label>
            </div>
            <details className="mt-3">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                How to export a session file
              </summary>
              <div className="mt-2 text-xs text-gray-500 space-y-1 pl-4 border-l border-hive-border">
                <p>1. Open a terminal and run:</p>
                <code className="block bg-hive-bg px-2 py-1 rounded text-gray-400">
                  npx playwright codegen x.com --save-storage=session.json
                </code>
                <p>2. Log in to Twitter/X in the browser window that opens</p>
                <p>3. Close the browser — the session is saved to <code>session.json</code></p>
                <p>4. Upload that file here</p>
              </div>
            </details>
          </div>
        )}

        {sessionError && (
          <p className="text-xs text-hive-bear mt-2">{sessionError}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tweets */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">
            Recent Tweets ({agent.tweets.length})
          </h2>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {agent.tweets.map((tweet) => (
              <div key={tweet.id} className="border-b border-hive-border pb-3 last:border-0">
                <p className="text-sm">{tweet.content}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span className={tweet.type === 'ORIGINAL' ? 'badge-neutral' : tweet.type === 'REPLY' ? 'badge-bull' : 'badge-bear'}>
                    {tweet.type}
                  </span>
                  {!tweet.tweetId && (
                    <span className="text-gray-500 italic">draft</span>
                  )}
                  {tweet.sentiment !== null && (
                    <span>{sentimentLabel(tweet.sentiment)}</span>
                  )}
                  <span>{new Date(tweet.postedAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {agent.tweets.length === 0 && (
              <p className="text-gray-500 text-sm">No tweets yet</p>
            )}
          </div>
        </div>

        {/* Opinions */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">
            Opinions ({agent.opinions.length})
          </h2>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {agent.opinions.map((opinion) => (
              <div key={opinion.id} className="border-b border-hive-border pb-3 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">${opinion.token}</span>
                  <span className={opinion.stance > 0 ? 'badge-bull' : opinion.stance < 0 ? 'badge-bear' : 'badge-neutral'}>
                    {sentimentLabel(opinion.stance)} ({(opinion.confidence * 100).toFixed(0)}%)
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{opinion.reasoning}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(opinion.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
            {agent.opinions.length === 0 && (
              <p className="text-gray-500 text-sm">No opinions yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
