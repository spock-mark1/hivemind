'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface ResolvedEdge {
  sourceAgentId: string;
  targetAgentId: string;
  type: string;
  sentiment: number | null;
  postedAt: string;
}

interface Props {
  interactions: ResolvedEdge[];
}

export default function NetworkGraph({ interactions }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [dimensions, setDimensions] = useState({ width: 600, height: 350 });

  useEffect(() => {
    api.getAllAgents().then(setAgents).catch(() => {
      // Fallback: if /all not available (user not authed for /agents), try dashboard data
      api.getAgents().then(setAgents).catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setDimensions({ width: clientWidth, height: Math.max(clientHeight, 350) });
    }
  }, []);

  const graphData = useMemo(() => {
    const nodes = agents.map((a) => ({
      id: a.id,
      name: a.name,
      persona: a.persona,
      status: a.status,
      val: a.status === 'RUNNING' ? 8 : 4,
    }));

    const agentIds = new Set(agents.map((a: any) => a.id));

    // Deduplicate edges: aggregate by source→target pair
    const edgeMap = new Map<string, { count: number; totalSentiment: number }>();
    for (const edge of interactions) {
      if (!agentIds.has(edge.sourceAgentId) || !agentIds.has(edge.targetAgentId)) continue;
      const key = `${edge.sourceAgentId}→${edge.targetAgentId}`;
      const existing = edgeMap.get(key);
      if (existing) {
        existing.count++;
        existing.totalSentiment += edge.sentiment ?? 0;
      } else {
        edgeMap.set(key, { count: 1, totalSentiment: edge.sentiment ?? 0 });
      }
    }

    const links = Array.from(edgeMap.entries()).map(([key, data]) => {
      const [source, target] = key.split('→');
      const avgSentiment = data.totalSentiment / data.count;
      return {
        source,
        target,
        color: avgSentiment > 0.1 ? '#22c55e' : avgSentiment < -0.1 ? '#ef4444' : '#6366f1',
        width: Math.min(1 + data.count * 0.5, 5), // thicker = more interactions
      };
    });

    return { nodes, links };
  }, [agents, interactions]);

  const nodeColor = (node: any) => {
    switch (node.status) {
      case 'RUNNING': return '#f59e0b';
      case 'PAUSED': return '#6366f1';
      case 'ERROR': return '#ef4444';
      default: return '#4b5563';
    }
  };

  return (
    <div ref={containerRef} className="w-full h-[350px]">
      {agents.length > 0 && (
        <ForceGraph2D
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="transparent"
          nodeColor={nodeColor}
          nodeLabel={(node: any) => `${node.name} (${node.persona})`}
          linkColor={(link: any) => link.color}
          linkWidth={(link: any) => link.width ?? 1.5}
          linkDirectionalArrowLength={4}
          nodeRelSize={5}
          cooldownTicks={100}
          enableZoomInteraction={true}
          enablePanInteraction={true}
        />
      )}
      {agents.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
          No agents to visualize
        </div>
      )}
    </div>
  );
}
