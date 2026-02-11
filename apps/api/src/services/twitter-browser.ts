import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { randomDelay, randomInt } from '@selanet/shared';

interface TweetResult {
  tweetId: string | null;
  success: boolean;
  error?: string;
}

interface ScannedTweet {
  tweetId: string;
  authorHandle: string;
  content: string;
  timestamp: string;
  likes: number;
  retweets: number;
}

// Rate limiting tracker per agent
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(agentId: string): boolean {
  const now = Date.now();
  const limit = rateLimiter.get(agentId);

  if (!limit || now > limit.resetAt) {
    rateLimiter.set(agentId, { count: 1, resetAt: now + 3600000 }); // 1 hour window
    return true;
  }

  if (limit.count >= 8) return false; // max 8 tweets per hour
  limit.count++;
  return true;
}

export class TwitterBrowser {
  private browser: Browser | null = null;

  /**
   * Initialize the browser with stealth settings
   */
  async init(): Promise<void> {
    if (this.browser) return;

    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-sandbox',
      ],
    });
  }

  /**
   * Create a browser context from saved session data
   */
  async createContext(sessionData?: Buffer): Promise<BrowserContext> {
    await this.init();

    const contextOptions: any = {
      viewport: { width: 1280 + randomInt(-50, 50), height: 720 + randomInt(-50, 50) },
      userAgent: this.getRandomUserAgent(),
      locale: 'en-US',
      timezoneId: 'America/New_York',
    };

    if (sessionData) {
      try {
        const storageState = JSON.parse(sessionData.toString('utf-8'));
        contextOptions.storageState = storageState;
      } catch {
        throw new Error('Invalid session data: corrupted or malformed JSON');
      }
    }

    if (!this.browser) {
      throw new Error('Browser failed to initialize');
    }
    const context = await this.browser.newContext(contextOptions);

    // Anti-detection: override navigator properties (runs in browser context)
    await context.addInitScript(`
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      window.chrome = { runtime: {} };
    `);

    return context;
  }

  /**
   * Save the current session state for later restoration
   */
  async saveSession(context: BrowserContext): Promise<Buffer> {
    const state = await context.storageState();
    return Buffer.from(JSON.stringify(state), 'utf-8');
  }

  /**
   * Post a new tweet
   */
  async postTweet(sessionData: Buffer, content: string, agentId: string): Promise<TweetResult> {
    if (!checkRateLimit(agentId)) {
      return { tweetId: null, success: false, error: 'Rate limit exceeded' };
    }

    const context = await this.createContext(sessionData);
    const page = await context.newPage();

    try {
      await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle' });
      await randomDelay(1500, 3000);

      // Type the tweet content with human-like delays
      const editor = page.getByRole('textbox');
      await editor.click();
      await this.typeHumanLike(page, content);
      await randomDelay(1000, 2000);

      // Click the tweet button
      const tweetButton = page.getByTestId('tweetButton');
      await tweetButton.click();
      await randomDelay(2000, 4000);

      // Try to extract the tweet ID from the URL
      const tweetId = await this.extractTweetId(page);

      return { tweetId, success: true };
    } catch (error: any) {
      return { tweetId: null, success: false, error: error.message };
    } finally {
      await page.close();
      await context.close();
    }
  }

  /**
   * Reply to a specific tweet
   */
  async replyToTweet(
    sessionData: Buffer,
    targetTweetId: string,
    content: string,
    agentId: string
  ): Promise<TweetResult> {
    if (!checkRateLimit(agentId)) {
      return { tweetId: null, success: false, error: 'Rate limit exceeded' };
    }

    const context = await this.createContext(sessionData);
    const page = await context.newPage();

    try {
      await page.goto(`https://x.com/i/status/${targetTweetId}`, { waitUntil: 'networkidle' });
      await randomDelay(2000, 3500);

      // Click the reply button
      const replyBox = page.getByTestId('tweetTextarea_0');
      await replyBox.click();
      await this.typeHumanLike(page, content);
      await randomDelay(1000, 2000);

      const replyButton = page.getByTestId('tweetButton');
      await replyButton.click();
      await randomDelay(2000, 4000);

      const tweetId = await this.extractTweetId(page);
      return { tweetId, success: true };
    } catch (error: any) {
      return { tweetId: null, success: false, error: error.message };
    } finally {
      await page.close();
      await context.close();
    }
  }

  /**
   * Quote tweet
   */
  async quoteTweet(
    sessionData: Buffer,
    targetTweetId: string,
    content: string,
    agentId: string
  ): Promise<TweetResult> {
    if (!checkRateLimit(agentId)) {
      return { tweetId: null, success: false, error: 'Rate limit exceeded' };
    }

    const context = await this.createContext(sessionData);
    const page = await context.newPage();

    try {
      await page.goto(`https://x.com/compose/tweet?quote=${targetTweetId}`, {
        waitUntil: 'networkidle',
      });
      await randomDelay(1500, 3000);

      const editor = page.getByRole('textbox');
      await editor.click();
      await this.typeHumanLike(page, content);
      await randomDelay(1000, 2000);

      const tweetButton = page.getByTestId('tweetButton');
      await tweetButton.click();
      await randomDelay(2000, 4000);

      const tweetId = await this.extractTweetId(page);
      return { tweetId, success: true };
    } catch (error: any) {
      return { tweetId: null, success: false, error: error.message };
    } finally {
      await page.close();
      await context.close();
    }
  }

  /**
   * Scan the home timeline for recent tweets
   */
  async scanTimeline(sessionData: Buffer): Promise<ScannedTweet[]> {
    const context = await this.createContext(sessionData);
    const page = await context.newPage();
    const tweets: ScannedTweet[] = [];

    try {
      await page.goto('https://x.com/home', { waitUntil: 'networkidle' });
      await randomDelay(2000, 4000);

      // Scroll and collect tweets
      const articles = await page.getByTestId('tweet').all();
      for (const article of articles.slice(0, 20)) {
        try {
          const tweetLink = await article.locator('a[href*="/status/"]').first();
          const href = await tweetLink.getAttribute('href');
          const tweetId = href?.split('/status/')[1]?.split(/[?/]/)[0] ?? '';

          const authorEl = await article.locator('[data-testid="User-Name"] a').first();
          const authorHandle = (await authorEl.getAttribute('href'))?.slice(1) ?? '';

          const contentEl = await article.locator('[data-testid="tweetText"]').first();
          const content = await contentEl.textContent() ?? '';

          const timeEl = await article.locator('time').first();
          const timestamp = (await timeEl.getAttribute('datetime')) ?? '';

          tweets.push({
            tweetId,
            authorHandle,
            content,
            timestamp,
            likes: 0,
            retweets: 0,
          });
        } catch {
          // Skip tweets that can't be parsed
        }
      }
    } catch (error) {
      console.error('Timeline scan failed:', error);
    } finally {
      await page.close();
      await context.close();
    }

    return tweets;
  }

  /**
   * Scan mentions/notifications
   */
  async scanMentions(sessionData: Buffer): Promise<ScannedTweet[]> {
    const context = await this.createContext(sessionData);
    const page = await context.newPage();
    const tweets: ScannedTweet[] = [];

    try {
      await page.goto('https://x.com/notifications/mentions', { waitUntil: 'networkidle' });
      await randomDelay(2000, 4000);

      const articles = await page.getByTestId('tweet').all();
      for (const article of articles.slice(0, 10)) {
        try {
          const tweetLink = await article.locator('a[href*="/status/"]').first();
          const href = await tweetLink.getAttribute('href');
          const tweetId = href?.split('/status/')[1]?.split(/[?/]/)[0] ?? '';

          const authorEl = await article.locator('[data-testid="User-Name"] a').first();
          const authorHandle = (await authorEl.getAttribute('href'))?.slice(1) ?? '';

          const contentEl = await article.locator('[data-testid="tweetText"]').first();
          const content = await contentEl.textContent() ?? '';

          const timeEl = await article.locator('time').first();
          const timestamp = (await timeEl.getAttribute('datetime')) ?? '';

          tweets.push({ tweetId, authorHandle, content, timestamp, likes: 0, retweets: 0 });
        } catch {
          // Skip unparseable
        }
      }
    } catch (error) {
      console.error('Mentions scan failed:', error);
    } finally {
      await page.close();
      await context.close();
    }

    return tweets;
  }

  /**
   * Simulate human-like typing
   */
  private async typeHumanLike(page: Page, text: string): Promise<void> {
    for (const char of text) {
      await page.keyboard.type(char, { delay: randomInt(30, 120) });
      // Occasional longer pause (simulating thinking)
      if (Math.random() < 0.05) {
        await randomDelay(200, 500);
      }
    }
  }

  /**
   * Try to extract the tweet ID after posting
   */
  private async extractTweetId(page: Page): Promise<string | null> {
    try {
      await page.waitForURL(/\/status\//, { timeout: 10000 });
      const url = page.url();
      const match = url.match(/\/status\/(\d+)/);
      return match?.[1] ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Get a random user agent string
   */
  private getRandomUserAgent(): string {
    const agents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    ];
    return agents[randomInt(0, agents.length - 1)];
  }

  /**
   * Cleanup
   */
  async close(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
  }
}

export const twitterBrowser = new TwitterBrowser();
