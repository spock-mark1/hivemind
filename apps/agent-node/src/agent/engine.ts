import { extractTokens } from '@selanet/shared';
import type { MarketContext, TweetData, MarketAnalysis } from '@selanet/shared';
import { AgentBrain } from './brain.js';
import { HubClient } from '../hub-client.js';
import { getConfig } from '../config.js';
import { marketDataService } from '../services/market-data.js';
import { selanetClient } from '../services/selanet-client.js';
import { twitterBrowser } from '../services/twitter-browser.js';

export class AgentEngine {
  private brain: AgentBrain;
  private hubClient: HubClient;
  private agentId: string | null = null;
  private loopInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private previousOpinions: Array<{
    token: string;
    stance: number;
    confidence: number;
    reasoning: string;
    createdAt: Date;
  }> = [];

  constructor() {
    const config = getConfig();
    this.brain = new AgentBrain(config.AGENT_PERSONA, config.AGENT_STRATEGY);
    this.hubClient = new HubClient(config.HUB_URL);
  }

  /**
   * Start the agent
   */
  async start(): Promise<void> {
    const config = getConfig();

    console.log('🐝 Starting Hivemind Agent...');

    // Check Hub health
    const isHealthy = await this.hubClient.healthCheck();
    if (!isHealthy) {
      throw new Error('Hub server is not reachable');
    }

    // Register with Hub
    if (!config.AGENT_ID) {
      console.log('📝 Registering with Hub...');
      const response = await this.hubClient.register({
        name: config.AGENT_NAME,
        persona: config.AGENT_PERSONA,
        strategy: config.AGENT_STRATEGY,
        twitterHandle: config.TWITTER_USERNAME,
      });
      this.agentId = response.agentId;
      console.log(`✅ Registered with ID: ${this.agentId}`);
    } else {
      this.agentId = config.AGENT_ID;
      console.log(`✅ Using existing ID: ${this.agentId}`);
    }

    // Start heartbeat
    this.startHeartbeat();

    // Start decision loop
    this.startDecisionLoop();

    console.log('✅ Agent running');
  }

  /**
   * Stop the agent
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping agent...');

    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.agentId) {
      await this.hubClient.heartbeat({
        agentId: this.agentId,
        status: 'IDLE',
      });
    }

    console.log('✅ Agent stopped');
  }

  /**
   * Start heartbeat to Hub
   */
  private startHeartbeat(): void {
    const config = getConfig();
    const interval = parseInt(config.HEARTBEAT_INTERVAL) * 1000;

    this.heartbeatInterval = setInterval(async () => {
      if (!this.agentId) return;

      try {
        await this.hubClient.heartbeat({
          agentId: this.agentId,
          status: 'RUNNING',
        });
        console.log('💓 Heartbeat sent');
      } catch (error) {
        console.error('❌ Heartbeat failed:', error);
      }
    }, interval);

    // Send initial heartbeat
    if (this.agentId) {
      this.hubClient.heartbeat({
        agentId: this.agentId,
        status: 'RUNNING',
      }).catch(console.error);
    }
  }

  /**
   * Start decision loop
   */
  private startDecisionLoop(): void {
    const config = getConfig();
    const minInterval = parseInt(config.LOOP_INTERVAL_MIN) * 60 * 1000;
    const maxInterval = parseInt(config.LOOP_INTERVAL_MAX) * 60 * 1000;

    const scheduleNext = () => {
      const delay = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
      console.log(`⏰ Next decision loop in ${Math.floor(delay / 60000)} minutes`);

      this.loopInterval = setTimeout(async () => {
        await this.runDecisionLoop();
        scheduleNext();
      }, delay);
    };

    // Run first loop immediately
    this.runDecisionLoop().then(scheduleNext).catch((error) => {
      console.error('❌ Initial decision loop failed:', error);
      scheduleNext();
    });
  }

  /**
   * Run one iteration of the decision loop
   */
  private async runDecisionLoop(): Promise<void> {
    if (!this.agentId) {
      console.error('❌ No agent ID, skipping loop');
      return;
    }

    console.log('🔄 Running decision loop...');

    try {
      // Step 1: Gather data
      console.log('📊 Step 1: Gathering market data...');
      const [prices, news] = await Promise.all([
        marketDataService.fetchPrices(),
        selanetClient.getNews().catch(() => []),
      ]);

      const context: MarketContext = {
        prices,
        recentTweets: [],
        currentOpinions: this.previousOpinions.map((o) => ({
          id: '', // Not needed for context
          agentId: this.agentId!,
          token: o.token,
          stance: o.stance,
          confidence: o.confidence,
          reasoning: o.reasoning,
          createdAt: o.createdAt,
        })),
        newsHeadlines: news.map((n) => n.title),
      };

      // Step 2: Scan timeline (if session available)
      console.log('🐦 Step 2: Scanning Twitter timeline...');
      const config = getConfig();
      let scannedTweets: TweetData[] = [];

      if (config.TWITTER_SESSION) {
        try {
          const sessionData = JSON.parse(config.TWITTER_SESSION);
          const timeline = await twitterBrowser.scanTimeline(sessionData);
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
          console.log(`  Found ${scannedTweets.length} tweets`);
        } catch (error) {
          console.error('  Failed to scan timeline:', error);
        }
      }

      // Step 3: AI analysis
      console.log('🧠 Step 3: Analyzing market...');
      const analyses = await this.brain.analyzeMarket(context);
      console.log(`  Generated ${analyses.length} analyses`);

      // Save opinions and send to Hub
      for (const analysis of analyses) {
        if (!analysis.token || typeof analysis.token !== 'string') continue;

        const stance = Math.max(-1, Math.min(1, Number(analysis.sentiment) || 0));
        const confidence = Math.max(0, Math.min(1, Number(analysis.confidence) || 0));
        const reasoning = typeof analysis.reasoning === 'string' ? analysis.reasoning : '';

        const opinion = {
          token: analysis.token,
          stance,
          confidence,
          reasoning,
          createdAt: new Date(),
        };

        this.previousOpinions.push(opinion);

        // Keep only last 10 opinions
        if (this.previousOpinions.length > 10) {
          this.previousOpinions.shift();
        }

        await this.hubClient.sendOpinion({
          agentId: this.agentId,
          opinion: {
            token: opinion.token,
            stance: opinion.stance,
            confidence: opinion.confidence,
            reasoning: opinion.reasoning,
          },
        });
      }

      // Step 4: Evaluate other agents' tweets
      console.log('💭 Step 4: Evaluating tweets...');
      const evaluations = await this.brain.evaluateTweets(scannedTweets);

      // Step 5: Decide action
      console.log('🎯 Step 5: Deciding action...');
      const action = await this.brain.decideAction(analyses, evaluations);

      if (action.type === 'pass') {
        console.log('  Decision: Pass (no action)');
        return;
      }

      console.log(`  Decision: ${action.type.toUpperCase()}`);

      // Step 6: Generate and post tweet
      console.log('✍️  Step 6: Generating tweet...');
      const targetAnalysis = analyses.find((a) => action.tokens.includes(a.token));
      const targetTweet = scannedTweets.find((t) => t.tweetId === action.targetTweetId);

      const content = await this.brain.generateTweet(action, {
        originalTweet: targetTweet?.content,
        analysis: targetAnalysis,
      });

      console.log(`  Content: "${content.slice(0, 60)}..."`);

      // Post via Twitter (if session available)
      let tweetId: string | undefined;

      if (config.TWITTER_SESSION) {
        try {
          const sessionData = JSON.parse(config.TWITTER_SESSION);
          let result;

          switch (action.type) {
            case 'reply':
              result = await twitterBrowser.replyToTweet(
                sessionData,
                action.targetTweetId!,
                content,
                this.agentId
              );
              tweetId = result.tweetId ?? undefined;
              break;
            case 'quote':
              result = await twitterBrowser.quoteTweet(
                sessionData,
                action.targetTweetId!,
                content,
                this.agentId
              );
              tweetId = result.tweetId ?? undefined;
              break;
            default:
              result = await twitterBrowser.postTweet(sessionData, content, this.agentId);
              tweetId = result.tweetId ?? undefined;
          }

          console.log(`  ✅ Posted to Twitter: ${tweetId}`);
        } catch (error) {
          console.error('  ❌ Failed to post to Twitter:', error);
        }
      }

      // Send tweet data to Hub
      const tweetType = action.type === 'tweet' ? 'ORIGINAL' : action.type === 'reply' ? 'REPLY' : 'QUOTE';
      await this.hubClient.sendTweet({
        agentId: this.agentId,
        tweet: {
          content,
          type: tweetType,
          tweetId,
          replyToTweetId: action.targetTweetId,
          sentiment: targetAnalysis?.sentiment != null ? Math.max(-1, Math.min(1, Number(targetAnalysis.sentiment) || 0)) : undefined,
          tokens: action.tokens,
          postedAt: new Date(),
        },
      });

      console.log('✅ Decision loop complete');
    } catch (error) {
      console.error('❌ Decision loop error:', error);

      // Report error to Hub
      if (this.agentId) {
        await this.hubClient.heartbeat({
          agentId: this.agentId,
          status: 'ERROR',
        }).catch(() => {});
      }
    }
  }
}
