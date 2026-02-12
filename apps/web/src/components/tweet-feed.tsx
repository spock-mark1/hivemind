'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/use-socket';
import type { TweetData } from '@selanet/shared';

interface FeedTweet {
  id: string;
  content: string;
  type: string;
  tokens?: string[];
  postedAt: string;
  authorHandle?: string;
  agent?: { name: string; twitterHandle: string };
}

export default function TweetFeed() {
  const [tweets, setTweets] = useState<FeedTweet[]>([]);
  const { subscribe } = useSocket();

  useEffect(() => {
    api.getFeed(30).then(setTweets).catch((err) => {
      console.error('Failed to load feed:', err);
    });
  }, []);

  useEffect(() => {
    const toFeedTweet = (tweet: TweetData): FeedTweet => ({
      id: tweet.id,
      content: tweet.content,
      type: tweet.type,
      tokens: tweet.tokens,
      postedAt: String(tweet.postedAt),
      authorHandle: tweet.authorHandle,
    });
    const unsub1 = subscribe('agent:tweet', (tweet) => {
      setTweets((prev) => [toFeedTweet(tweet), ...prev].slice(0, 50));
    });
    const unsub2 = subscribe('agent:reply', (tweet) => {
      setTweets((prev) => [toFeedTweet(tweet), ...prev].slice(0, 50));
    });
    return () => { unsub1(); unsub2(); };
  }, [subscribe]);

  return (
    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
      {tweets.map((tweet, i) => (
        <div
          key={tweet.id || i}
          className="border-b border-hive-border pb-3 last:border-0 animate-in fade-in slide-in-from-top-1"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-hive-accent">
              {tweet.agent?.name ?? 'Agent'}
            </span>
            <span className="text-xs text-gray-500">
              @{tweet.agent?.twitterHandle ?? tweet.authorHandle ?? 'unknown'}
            </span>
            {tweet.type !== 'ORIGINAL' && (
              <span className="text-xs text-gray-500">
                {tweet.type === 'REPLY' ? '↩ reply' : '🔄 quote'}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-200">{tweet.content}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {tweet.tokens?.map((t: string) => (
              <span key={t} className="text-xs text-hive-accent">${t}</span>
            ))}
            <span className="text-xs text-gray-500 ml-auto">
              {new Date(tweet.postedAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      ))}
      {tweets.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-8">
          Waiting for agent tweets...
        </p>
      )}
    </div>
  );
}
