import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@selanet/db';
import { extractTokens } from '@selanet/shared';
import { getConfig } from '../config.js';
import { AgentBrain } from '../ai/agent-brain.js';
import { twitterBrowser } from '../services/twitter-browser.js';
import { marketDataService } from '../services/market-data.js';
import { selanetClient } from '../services/selanet-client.js';
import { realtime } from '../services/realtime.js';
import type { MarketContext, TweetData } from '@selanet/shared';

export function startAgentLoopWorker() {
  const config = getConfig();
  const connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });

  const worker = new Worker(
    'agent-loop',
    async (job) => {
      const { agentId } = job.data as { agentId: string };
      console.log(`[AgentLoop] Running decision loop for agent ${agentId}`);

      // Fetch agent
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: { opinions: { orderBy: { createdAt: 'desc' }, take: 10 } },
      });

      if (!agent || agent.status !== 'RUNNING') {
        console.log(`[AgentLoop] Agent ${agentId} is not running, skipping`);
        return;
      }

      const brain = new AgentBrain(agent.persona, agent.strategy);

      try {
        // Step 1: Gather data
        const [prices, news] = await Promise.all([
          marketDataService.fetchPrices(),
          selanetClient.getNews(),
        ]);

        const context: MarketContext = {
          prices,
          recentTweets: [],
          currentOpinions: agent.opinions.map((o) => ({
            id: o.id,
            agentId: o.agentId,
            token: o.token,
            stance: o.stance,
            confidence: o.confidence,
            reasoning: o.reasoning,
            createdAt: o.createdAt,
          })),
          newsHeadlines: news.map((n) => n.title),
        };

        // Step 2: Scan timeline (if session data available)
        let scannedTweets: TweetData[] = [];
        if (agent.sessionData) {
          const timeline = await twitterBrowser.scanTimeline(agent.sessionData);
          scannedTweets = timeline.map((t) => ({
            id: t.tweetId,
            tweetId: t.tweetId,
            authorHandle: t.authorHandle,
            content: t.content,
            type: 'ORIGINAL' as const,
            tokens: extractTokens(t.content),
            postedAt: new Date(t.timestamp),
            reactions: t.likes + t.retweets,
          }));
          context.recentTweets = scannedTweets;
        }

        // Step 3: AI analysis
        const analyses = await brain.analyzeMarket(context);

        // Save opinions (validate and clamp values)
        for (const analysis of analyses) {
          if (!analysis.token || typeof analysis.token !== 'string') continue;
          const stance = Math.max(-1, Math.min(1, Number(analysis.sentiment) || 0));
          const confidence = Math.max(0, Math.min(1, Number(analysis.confidence) || 0));
          const reasoning = typeof analysis.reasoning === 'string' ? analysis.reasoning : '';
          const opinion = await prisma.opinion.create({
            data: {
              agentId: agent.id,
              token: analysis.token,
              stance,
              confidence,
              reasoning,
            },
          });

          realtime.emitOpinion({
            id: opinion.id,
            agentId: opinion.agentId,
            token: opinion.token,
            stance: opinion.stance,
            confidence: opinion.confidence,
            reasoning: opinion.reasoning,
            createdAt: opinion.createdAt,
          });
        }

        // Step 4: Evaluate other agents' tweets
        const evaluations = await brain.evaluateTweets(scannedTweets);

        // Step 5: Decide action
        const action = await brain.decideAction(analyses, evaluations);

        if (action.type === 'pass') {
          console.log(`[AgentLoop] Agent ${agentId} decided to pass`);
          return;
        }

        // Step 6: Generate and post tweet
        const targetAnalysis = analyses.find((a) => action.tokens.includes(a.token));
        const targetTweet = scannedTweets.find((t) => t.tweetId === action.targetTweetId);

        const content = await brain.generateTweet(action, {
          originalTweet: targetTweet?.content,
          analysis: targetAnalysis,
        });

        if (!agent.sessionData) {
          console.log(`[AgentLoop] Agent ${agentId} has no session data, storing tweet as draft`);
          // Store tweet without posting
          await prisma.tweet.create({
            data: {
              agentId: agent.id,
              content,
              type: action.type === 'tweet' ? 'ORIGINAL' : action.type === 'reply' ? 'REPLY' : 'QUOTE',
              replyToTweetId: action.targetTweetId,
              sentiment: targetAnalysis?.sentiment ?? null,
              tokens: action.tokens,
            },
          });
          return;
        }

        // Post via Playwright
        let result;
        switch (action.type) {
          case 'reply':
            result = await twitterBrowser.replyToTweet(
              agent.sessionData,
              action.targetTweetId!,
              content,
              agent.id
            );
            break;
          case 'quote':
            result = await twitterBrowser.quoteTweet(
              agent.sessionData,
              action.targetTweetId!,
              content,
              agent.id
            );
            break;
          default:
            result = await twitterBrowser.postTweet(agent.sessionData, content, agent.id);
        }

        // Save tweet to DB
        const tweetType = action.type === 'tweet' ? 'ORIGINAL' : action.type === 'reply' ? 'REPLY' : 'QUOTE';
        const tweet = await prisma.tweet.create({
          data: {
            agentId: agent.id,
            tweetId: result.tweetId,
            content,
            type: tweetType,
            replyToTweetId: action.targetTweetId,
            sentiment: targetAnalysis?.sentiment ?? null,
            tokens: action.tokens,
          },
        });

        const tweetData: TweetData = {
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
        };

        if (tweetType === 'REPLY') {
          realtime.emitReply(tweetData);
        } else {
          realtime.emitTweet(tweetData);
        }

        console.log(`[AgentLoop] Agent ${agentId} posted ${tweetType}: "${content.slice(0, 50)}..."`);
      } catch (error) {
        console.error(`[AgentLoop] Agent ${agentId} error:`, error);
        await prisma.agent.update({
          where: { id: agentId },
          data: { status: 'ERROR' },
        });
      }
    },
    { connection, concurrency: 3 }
  );

  worker.on('failed', (job, err) => {
    console.error(`[AgentLoop] Job ${job?.id} failed:`, err.message);
  });

  console.log('[AgentLoop] Worker started');
  return { worker, connection };
}
