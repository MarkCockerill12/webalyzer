'use client';

import React, { useState } from 'react';
import { GraphNode, GraphLink } from '@/lib/types';
import { Network, Database, Cpu, Server, Globe, ZoomIn, ZoomOut } from 'lucide-react';

interface VisualNetworkGraphProps {
  data: {
    nodes: GraphNode[];
    links: GraphLink[];
  };
}

export function VisualNetworkGraph({ data }: VisualNetworkGraphProps) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);

  if (!data || !data.nodes || data.nodes.length === 0) {
    return null;
  }

  const width = 800;
  const height = 400;
  const centerX = width / 2;
  const centerY = height / 2;

  const targetNode = data.nodes.find((n) => n.type === 'domain') || data.nodes[0];
  const outerNodes = data.nodes.filter((n) => n.id !== targetNode.id);

  const radius = 150;
  const step = (2 * Math.PI) / (outerNodes.length || 1);

  const nodePositions: Record<string, { x: number; y: number }> = {
    [targetNode.id]: { x: centerX, y: centerY },
  };

  outerNodes.forEach((node, idx) => {
    const angle = idx * step - Math.PI / 2;
    nodePositions[node.id] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  return (
    <div className="y2k-window p-3 space-y-3 relative overflow-hidden">
      {/* Header Controls */}
      <div className="flex items-center justify-between border-b-2 border-[var(--shadow)] pb-2 font-mono">
        <div className="flex items-center gap-2">
          <Network className="text-[var(--text-main)]" size={18} />
          <div>
            <div className="font-extrabold text-sm text-[var(--text-main)]">Interactive Visual Dependency Graph</div>
            <div className="text-[11px] text-slate-700">Live Mapping: Domain &rarr; Tech Stack &rarr; Endpoints &rarr; Infrastructure</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(Math.min(zoom + 0.15, 1.5))}
            className="p-1.5 y2k-button"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => setZoom(Math.max(zoom - 0.15, 0.7))}
            className="p-1.5 y2k-button"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
        </div>
      </div>

      {/* SVG Network Graph */}
      <div className="relative w-full h-[360px] y2k-inset-box overflow-hidden flex items-center justify-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
        >
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="var(--shadow)" strokeWidth="1" opacity="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Links / Connections */}
          {data.links.map((link, idx) => {
            const start = nodePositions[link.source] || { x: centerX, y: centerY };
            const end = nodePositions[link.target] || { x: centerX, y: centerY };

            return (
              <g key={idx}>
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="#000000"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />
              </g>
            );
          })}

          {/* Nodes */}
          {data.nodes.map((node) => {
            const pos = nodePositions[node.id] || { x: centerX, y: centerY };
            const isTarget = node.id === targetNode.id;
            const isSelected = selectedNode?.id === node.id;
            const color = isTarget ? 'var(--chrome-light)' : node.type === 'tech' ? 'var(--chrome-dark)' : node.type === 'datasource' ? 'var(--silver-bg-2)' : 'var(--panel-dark)';

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => setSelectedNode(node)}
                className="cursor-pointer group"
              >
                <circle
                  r={isTarget ? 26 : 18}
                  fill={color}
                  stroke="var(--shadow)"
                  strokeWidth={isSelected ? 3.5 : 2}
                  className="shadow-md"
                />

                <foreignObject
                  x={isTarget ? -12 : -8}
                  y={isTarget ? -12 : -8}
                  width={isTarget ? 24 : 16}
                  height={isTarget ? 24 : 16}
                  className="pointer-events-none text-[var(--text-main)] flex items-center justify-center font-bold"
                >
                  {node.type === 'domain' && <Globe size={isTarget ? 20 : 14} />}
                  {node.type === 'tech' && <Cpu size={isTarget ? 20 : 14} />}
                  {node.type === 'datasource' && <Database size={isTarget ? 20 : 14} />}
                  {node.type === 'server' && <Server size={isTarget ? 20 : 14} />}
                </foreignObject>

                <text
                  y={isTarget ? 40 : 30}
                  textAnchor="middle"
                  fill="var(--text-main)"
                  fontSize={isTarget ? '12' : '10'}
                  fontWeight="bold"
                  className="pointer-events-none font-mono"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {selectedNode && (
          <div className="absolute bottom-3 left-3 right-3 y2k-inset-box p-3 text-xs text-[var(--text-main)] flex items-center justify-between">
            <div className="space-y-0.5 font-mono">
              <div className="font-black text-sm flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border border-[var(--shadow)]" style={{ backgroundColor: selectedNode.color }} />
                {selectedNode.label} ({selectedNode.type.toUpperCase()})
              </div>
              <div className="text-[11px] text-slate-700 font-bold truncate">{selectedNode.detail || selectedNode.id}</div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="px-2.5 py-1 y2k-button text-xs font-black"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
