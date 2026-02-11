import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@selanet/db';
import { extractTokens } from '@selanet/shared';
import { getConfig } from '../config.js';
import { twitterBrowser } from '../services/twitter-browser.js';
import { AgentBrain } from '../ai/agent-brain.js';
import { realtime } from '../services/realtime.js';
import type { TweetData } from '@selanet/shared';

const SCAN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export function startTweetScanWorker() {
  const config = getConfig();
  const connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });
  const queue = new Queue('tweet-scan', { connection });

  // Add repeatable job
  queue.add('scan', {}, {
    repeat: { every: SCAN_INTERVAL_MS },
    jobId: 'tweet-scan-main',
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 5 },
  });

  const worker = new Worker(
    'tweet-scan',
    async (job) => {
      console.log('[TweetScan] Scanning for new tweets and mentions...');

      // Get all running agents with session data
      const agents = await prisma.agent.findMany({
        where: { status: 'RUNNING', sessionData: { not: null } },
      });

      for (const agent of agents) {
        if (!agent.sessionData) continue;

        try {
          // Scan mentions
          const mentions = await twitterBrowser.scanMentions(agent.sessionData);

          for (const mention of mentions) {
            // Check if we've already processed this tweet
            const existing = await prisma.tweet.findFirst({
              where: { replyToTweetId: mention.tweetId, agentId: agent.id },
            });
            if (existing) continue;

            // Check if it's from another agent in our system
            const otherAgent = await prisma.agent.findFirst({
              where: { twitterHandle: mention.authorHandle },
            });

            if (otherAgent) {
              // Use AI to decide whether to respond
              const brain = new AgentBrain(agent.persona, agent.strategy);
              const tweetData: TweetData = {
                id: mention.tweetId,
                tweetId: mention.tweetId,
                authorHandle: mention.authorHandle,
                content: mention.content,
                type: 'ORIGINAL',
                tokens: extractTokens(mention.content),
                postedAt: new Date(mention.timestamp),
                reactions: mention.likes + mention.retweets,
              };

              const evaluations = await brain.evaluateTweets([tweetData]);
              const eval0 = evaluations[0];

              if (eval0?.shouldRespond) {
                const action = {
                  type: (eval0.responseType || 'reply') as 'reply' | 'quote',
                  targetTweetId: mention.tweetId,
                  tokens: extractTokens(mention.content),
                };

                const content = await brain.generateTweet(action, {
                  originalTweet: mention.content,
                });

                const result = action.type === 'reply'
                  ? await twitterBrowser.replyToTweet(agent.sessionData!, mention.tweetId, content, agent.id)
                  : await twitterBrowser.quoteTweet(agent.sessionData!, mention.tweetId, content, agent.id);

                const tweet = await prisma.tweet.create({
                  data: {
                    agentId: agent.id,
                    tweetId: result.tweetId,
                    content,
                    type: action.type === 'reply' ? 'REPLY' : 'QUOTE',
                    replyToTweetId: mention.tweetId,
                    tokens: action.tokens,
                  },
                });

                realtime.emitReply({
                  id: tweet.id,
                  tweetId: tweet.tweetId ?? undefined,
                  authorHandle: agent.twitterHandle,
                  content: tweet.content,
                  type: tweet.type,
                  replyToTweetId: tweet.replyToTweetId ?? undefined,
                  sentiment: tweet.sentiment ?? undefined,
                  tokens: tweet.tokens,
                  postedAt: tweet.postedAt,
                  reactions: 0,
                });

                console.log(`[TweetScan] Agent ${agent.name} responded to @${mention.authorHandle}`);
              }
            }
          }
        } catch (error) {
          console.error(`[TweetScan] Error scanning for agent ${agent.name}:`, error);
        }
      }
    },
    { connection, concurrency: 1 }
  );

  worker.on('failed', (job, err) => {
    console.error(`[TweetScan] Job ${job?.id} failed:`, err.message);
  });

  console.log('[TweetScan] Worker started');
  return { worker, queue, connection };
}
