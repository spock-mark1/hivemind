import { getIO } from '../plugins/websocket.js';
import type { TweetData, Opinion, ConsensusEvent, MarketData } from '@selanet/shared';

export const realtime = {
  emitTweet(tweet: TweetData) {
    const io = getIO();
    io.emit('agent:tweet', tweet);
    io.to(`agent:${tweet.id}`).emit('agent:tweet', tweet);
  },

  emitReply(tweet: TweetData) {
    const io = getIO();
    io.emit('agent:reply', tweet);
  },

  emitOpinion(opinion: Opinion) {
    const io = getIO();
    io.emit('agent:opinion', opinion);
    io.to(`token:${opinion.token}`).emit('agent:opinion', opinion);
  },

  emitConsensus(event: ConsensusEvent) {
    const io = getIO();
    io.emit('consensus:event', event);
    io.to(`token:${event.token}`).emit('consensus:event', event);
  },

  emitMarketUpdate(data: MarketData) {
    const io = getIO();
    io.emit('market:update', data);
    io.to(`token:${data.token}`).emit('market:update', data);
  },
};
