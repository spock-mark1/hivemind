import { askGemini, askGeminiJSON } from '../ai/gemini-client.js';
import { buildAnalystPrompt, buildMarketDataContext } from '../ai/prompts/analyst.js';
import { buildTweeterPrompt, buildReplyPrompt, buildQuotePrompt } from '../ai/prompts/tweeter.js';
import { buildDebaterPrompt } from '../ai/prompts/debater.js';
import type {
  MarketContext,
  MarketAnalysis,
  TweetData,
  TweetEvaluation,
  AgentAction,
} from '@selanet/shared';

export class AgentBrain {
  constructor(
    private persona: string,
    private strategy: string
  ) {}

  /**
   * Step 1: Analyze current market data
   */
  async analyzeMarket(context: MarketContext): Promise<MarketAnalysis[]> {
    const systemPrompt = buildAnalystPrompt(this.persona, this.strategy);
    const marketContext = buildMarketDataContext(context.prices);

    const newsContext = context.newsHeadlines.length > 0
      ? `\n\nRecent News Headlines:\n${context.newsHeadlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}`
      : '';

    const currentOpinions = context.currentOpinions.length > 0
      ? `\n\nYour Previous Opinions:\n${context.currentOpinions.map((o) => `${o.token}: stance=${o.stance.toFixed(2)}, confidence=${o.confidence.toFixed(2)}`).join('\n')}`
      : '';

    const prompt = `${marketContext}${newsContext}${currentOpinions}\n\nAnalyze the top 3-5 tokens you have the strongest opinion about. Return a JSON array of analyses.`;

    return askGeminiJSON<MarketAnalysis[]>(systemPrompt, [{ role: 'user', content: prompt }], {
      maxTokens: 2048,
      temperature: 0.7,
    });
  }

  /**
   * Step 2: Evaluate other agents' tweets
   */
  async evaluateTweets(tweets: TweetData[]): Promise<TweetEvaluation[]> {
    if (tweets.length === 0) return [];

    const systemPrompt = buildDebaterPrompt(this.persona);
    const tweetContext = tweets
      .map((t) => `[${t.id}] @${t.authorHandle}: "${t.content}" (sentiment: ${t.sentiment?.toFixed(2) ?? 'unknown'})`)
      .join('\n');

    return askGeminiJSON<TweetEvaluation[]>(systemPrompt, [
      { role: 'user', content: `Evaluate these tweets:\n\n${tweetContext}` },
    ], { maxTokens: 1024 });
  }

  /**
   * Step 3: Decide what action to take
   */
  async decideAction(
    analyses: MarketAnalysis[],
    evaluations: TweetEvaluation[]
  ): Promise<AgentAction> {
    // Find tweets worth responding to
    const respondable = evaluations.filter((e) => e.shouldRespond);

    // If there's a strong disagreement, prioritize a reply/quote
    if (respondable.length > 0) {
      const strongest = respondable.reduce((a, b) =>
        b.strength > a.strength ? b : a
      );
      return {
        type: strongest.agree ? 'reply' : 'quote',
        targetTweetId: strongest.tweetId,
        tokens: [],
      };
    }

    // Otherwise, post an original tweet about the strongest analysis
    if (analyses.length > 0) {
      const strongest = analyses.reduce((a, b) =>
        Math.abs(b.sentiment) * b.confidence > Math.abs(a.sentiment) * a.confidence ? b : a
      );
      return {
        type: 'tweet',
        tokens: [strongest.token],
      };
    }

    return { type: 'pass', tokens: [] };
  }

  /**
   * Step 4: Generate tweet content
   */
  async generateTweet(action: AgentAction, context?: { originalTweet?: string; analysis?: MarketAnalysis }): Promise<string> {
    let systemPrompt: string;
    let userMessage: string;

    switch (action.type) {
      case 'reply':
        systemPrompt = buildReplyPrompt(this.persona);
        userMessage = `Original tweet: "${context?.originalTweet ?? ''}"\n\nYour analysis: ${context?.analysis ? JSON.stringify(context.analysis) : 'Form your own view'}\n\nWrite your reply:`;
        break;

      case 'quote':
        systemPrompt = buildQuotePrompt(this.persona);
        userMessage = `Original tweet: "${context?.originalTweet ?? ''}"\n\nYour analysis: ${context?.analysis ? JSON.stringify(context.analysis) : 'Form your own view'}\n\nWrite your quote tweet:`;
        break;

      case 'tweet':
      default:
        systemPrompt = buildTweeterPrompt(this.persona);
        userMessage = context?.analysis
          ? `Based on your analysis:\n${JSON.stringify(context.analysis)}\n\nWrite a tweet sharing your market view:`
          : `Write a tweet about the current crypto market:`;
        break;
    }

    const content = await askGemini(systemPrompt, [{ role: 'user', content: userMessage }], {
      maxTokens: 256,
      temperature: 0.8,
    });

    // Ensure tweet is within character limit
    return content.slice(0, 280);
  }
}
