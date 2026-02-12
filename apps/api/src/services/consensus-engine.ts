import { prisma } from '@selanet/db';
import { CONSENSUS_THRESHOLDS, TRACKED_TOKENS } from '@selanet/shared';
import { realtime } from './realtime.js';
import type { ConsensusEvent } from '@selanet/shared';

export class ConsensusEngine {
  /**
   * Analyze opinions and detect consensus events
   */
  async analyze(): Promise<ConsensusEvent[]> {
    const since = new Date(
      Date.now() - CONSENSUS_THRESHOLDS.LOOKBACK_HOURS * 60 * 60 * 1000
    );

    // Check for recent events to avoid duplicates (within last analysis period)
    const recentEvents = await prisma.consensusEvent.findMany({
      where: { timestamp: { gte: since } },
      select: { token: true, type: true, avgSentiment: true },
    });
    // Use direction-aware keys for AGREEMENT (bullish vs bearish are distinct events)
    const recentEventKeys = new Set(recentEvents.map((e) => {
      if (e.type === 'AGREEMENT') {
        const dir = e.avgSentiment >= 0 ? 'BULL' : 'BEAR';
        return `${e.token}:AGREEMENT:${dir}`;
      }
      return `${e.token}:${e.type}`;
    }));

    const events: ConsensusEvent[] = [];

    for (const token of TRACKED_TOKENS) {
      // Get recent opinions for this token
      const opinions = await prisma.opinion.findMany({
        where: {
          token,
          createdAt: { gte: since },
        },
        include: { agent: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });

      // Deduplicate: take most recent opinion per agent
      const latestByAgent = new Map<string, typeof opinions[0]>();
      for (const op of opinions) {
        if (!latestByAgent.has(op.agentId)) {
          latestByAgent.set(op.agentId, op);
        }
      }

      const uniqueOpinions = Array.from(latestByAgent.values());
      if (uniqueOpinions.length < CONSENSUS_THRESHOLDS.MIN_PARTICIPANTS) continue;

      const stances = uniqueOpinions.map((o) => o.stance);
      const avgStance = stances.reduce((a, b) => a + b, 0) / stances.length;

      // Check for AGREEMENT: majority in same direction
      const bullish = stances.filter((s) => s > 0.1).length;
      const bearish = stances.filter((s) => s < -0.1).length;
      const total = stances.length;

      const bullRatio = bullish / total;
      const bearRatio = bearish / total;

      if (bullRatio >= CONSENSUS_THRESHOLDS.AGREEMENT_RATIO && !recentEventKeys.has(`${token}:AGREEMENT:BULL`)) {
        const event = await this.createEvent(token, 'AGREEMENT', avgStance, total,
          `${(bullRatio * 100).toFixed(0)}% of agents are bullish on $${token}. Average sentiment: ${avgStance.toFixed(2)}`
        );
        events.push(event);
        continue;
      }

      if (bearRatio >= CONSENSUS_THRESHOLDS.AGREEMENT_RATIO && !recentEventKeys.has(`${token}:AGREEMENT:BEAR`)) {
        const event = await this.createEvent(token, 'AGREEMENT', avgStance, total,
          `${(bearRatio * 100).toFixed(0)}% of agents are bearish on $${token}. Average sentiment: ${avgStance.toFixed(2)}`
        );
        events.push(event);
        continue;
      }

      // Check for DISAGREEMENT: high spread
      const spread = Math.max(...stances) - Math.min(...stances);
      if (spread >= CONSENSUS_THRESHOLDS.DISAGREEMENT_SPREAD && bullRatio > 0.3 && bearRatio > 0.3 && !recentEventKeys.has(`${token}:DISAGREEMENT`)) {
        const event = await this.createEvent(token, 'DISAGREEMENT', avgStance, total,
          `Agents are divided on $${token}: ${bullish} bullish vs ${bearish} bearish. Spread: ${spread.toFixed(2)}`
        );
        events.push(event);
        continue;
      }

      // Check for SHIFT: compare with previous period
      const previousPeriod = new Date(since.getTime() - CONSENSUS_THRESHOLDS.LOOKBACK_HOURS * 60 * 60 * 1000);
      const prevOpinions = await prisma.opinion.findMany({
        where: {
          token,
          createdAt: { gte: previousPeriod, lt: since },
        },
      });

      if (prevOpinions.length >= CONSENSUS_THRESHOLDS.MIN_PARTICIPANTS) {
        const prevByAgent = new Map<string, typeof prevOpinions[0]>();
        for (const op of prevOpinions) {
          if (!prevByAgent.has(op.agentId)) {
            prevByAgent.set(op.agentId, op);
          }
        }
        const prevStances = Array.from(prevByAgent.values()).map((o) => o.stance);
        const prevAvg = prevStances.reduce((a, b) => a + b, 0) / prevStances.length;
        const delta = avgStance - prevAvg;

        if (Math.abs(delta) >= CONSENSUS_THRESHOLDS.SHIFT_DELTA && !recentEventKeys.has(`${token}:SHIFT`)) {
          const direction = delta > 0 ? 'bullish' : 'bearish';
          const event = await this.createEvent(token, 'SHIFT', avgStance, total,
            `Sentiment shift on $${token}: agents moving ${direction}. Δ${delta.toFixed(2)} (${prevAvg.toFixed(2)} → ${avgStance.toFixed(2)})`
          );
          events.push(event);
        }
      }
    }

    return events;
  }

  private async createEvent(
    token: string,
    type: 'AGREEMENT' | 'DISAGREEMENT' | 'SHIFT',
    avgSentiment: number,
    participantCount: number,
    summary: string
  ): Promise<ConsensusEvent> {
    const dbEvent = await prisma.consensusEvent.create({
      data: { token, type, avgSentiment, participantCount, summary },
    });

    const event: ConsensusEvent = {
      id: dbEvent.id,
      token: dbEvent.token,
      type: dbEvent.type,
      avgSentiment: dbEvent.avgSentiment,
      participantCount: dbEvent.participantCount,
      summary: dbEvent.summary,
      timestamp: dbEvent.timestamp,
    };

    realtime.emitConsensus(event);
    console.log(`[Consensus] ${type} event for ${token}: ${summary}`);

    return event;
  }
}

export const consensusEngine = new ConsensusEngine();
