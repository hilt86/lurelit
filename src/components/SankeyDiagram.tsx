'use client';

import { useEffect, useRef, useState } from 'react';

interface FlowData {
  total: number;
  completed: number;
  failed: number;
  phishing_email: number;
  smishing: number;
  spam: number;
  legitimate: number;
  unknown: number;
  autoHunted: number;
  hitlApproved: number;
  hitlSkipped: number;
  noHunt: number;
  hunted: number;
  not_hunted: number;
}

interface SankeyNode {
  id: string;
  label: string;
  value: number;
  color: string;
  x: number;
  y: number;
  height: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  color: string;
}

const NODE_WIDTH = 16;
const NODE_RADIUS = 4;
const MIN_NODE_HEIGHT = 6;
const LABEL_GAP = 10;
const SVG_HEIGHT = 380;
const MIN_NODE_GAP = 45;

function buildNodes(flow: FlowData, width: number, height: number): SankeyNode[] {
  const cols = [0.02, 0.22, 0.42, 0.64, 0.88];
  const colX = cols.map(c => c * width);
  const usableHeight = height - 80;
  const topPad = 44;

  const col0Total = flow.total || 1;
  const col1Total = flow.completed + flow.failed || 1;
  const col2Threats = flow.phishing_email + flow.smishing;
  const col2Safe = flow.spam + flow.legitimate + flow.unknown;
  const col2Total = col2Threats + col2Safe || 1;
  const col3Total = flow.autoHunted + flow.hitlApproved + flow.hitlSkipped + flow.noHunt || 1;
  const col4Total = flow.hunted + flow.not_hunted || 1;

  function nodeH(value: number, colTotal: number): number {
    return Math.max(MIN_NODE_HEIGHT, (value / colTotal) * usableHeight * 0.4);
  }

  const totalH = nodeH(flow.total, col0Total);
  const nodes: SankeyNode[] = [
    { id: 'total', label: 'Total', value: flow.total, color: 'var(--blue)', x: colX[0], y: topPad + (usableHeight - totalH) / 2, height: totalH },
  ];

  const completedH = nodeH(flow.completed, col1Total);
  const failedH = nodeH(flow.failed, col1Total);
  const gap1 = Math.max(MIN_NODE_GAP, (usableHeight - completedH - failedH) / 3);
  const col1Start = topPad + (usableHeight - completedH - failedH - gap1) / 2;
  nodes.push(
    { id: 'completed', label: 'Completed', value: flow.completed, color: 'var(--teal)', x: colX[1], y: col1Start, height: completedH },
    { id: 'failed', label: 'Failed', value: flow.failed, color: '#666', x: colX[1], y: col1Start + completedH + gap1, height: failedH },
  );

  const types = [
    { id: 'phishing', label: 'Phishing', value: flow.phishing_email, color: 'var(--pink)' },
    { id: 'smishing', label: 'Smishing', value: flow.smishing, color: 'var(--pink-bright)' },
    { id: 'spam', label: 'Spam', value: flow.spam, color: 'var(--yellow)' },
    { id: 'legitimate', label: 'Legitimate', value: flow.legitimate, color: 'var(--teal)' },
    { id: 'unknown', label: 'Unknown', value: flow.unknown, color: '#666' },
  ].filter(t => t.value > 0);

  const typeHeights = types.map(t => nodeH(t.value, col2Total));
  const gap2 = Math.max(MIN_NODE_GAP, (usableHeight - typeHeights.reduce((s, h) => s + h, 0)) / (types.length + 1));
  const totalTypeH = typeHeights.reduce((s, h) => s + h, 0) + gap2 * (types.length - 1);
  let yPos = topPad + (usableHeight - totalTypeH) / 2;
  for (let i = 0; i < types.length; i++) {
    nodes.push({ ...types[i], x: colX[2], y: yPos, height: typeHeights[i] });
    yPos += typeHeights[i] + gap2;
  }

  const decisionPaths = [
    { id: 'auto_hunted', label: 'Auto-hunted', value: flow.autoHunted, color: 'var(--teal-bright, #5eead4)' },
    { id: 'hitl_approved', label: 'HITL Approved', value: flow.hitlApproved, color: 'var(--yellow, #fbbf24)' },
    { id: 'hitl_skipped', label: 'HITL Skipped', value: flow.hitlSkipped, color: '#888' },
    { id: 'no_hunt', label: 'No Hunt', value: flow.noHunt, color: '#555' },
  ].filter(d => d.value > 0);

  const dpHeights = decisionPaths.map(d => nodeH(d.value, col3Total));
  const gap3 = Math.max(MIN_NODE_GAP, (usableHeight - dpHeights.reduce((s, h) => s + h, 0)) / (decisionPaths.length + 1));
  const totalDpH = dpHeights.reduce((s, h) => s + h, 0) + gap3 * (decisionPaths.length - 1);
  let yPos3 = topPad + (usableHeight - totalDpH) / 2;
  for (let i = 0; i < decisionPaths.length; i++) {
    nodes.push({ ...decisionPaths[i], x: colX[3], y: yPos3, height: dpHeights[i] });
    yPos3 += dpHeights[i] + gap3;
  }

  if (flow.hunted + flow.not_hunted > 0) {
    const huntedH = nodeH(flow.hunted, col4Total);
    const notHuntedH = nodeH(flow.not_hunted, col4Total);
    const gap4 = Math.max(MIN_NODE_GAP, (usableHeight - huntedH - notHuntedH) / 3);
    const col4Start = topPad + (usableHeight - huntedH - notHuntedH - gap4) / 2;
    nodes.push(
      { id: 'hunted', label: 'Hunted', value: flow.hunted, color: 'var(--teal-bright)', x: colX[4], y: col4Start, height: huntedH },
      { id: 'not_hunted', label: 'Not Hunted', value: flow.not_hunted, color: '#555', x: colX[4], y: col4Start + huntedH + gap4, height: notHuntedH },
    );
  }

  return nodes;
}

function buildLinks(flow: FlowData): SankeyLink[] {
  const links: SankeyLink[] = [];

  if (flow.completed > 0) links.push({ source: 'total', target: 'completed', value: flow.completed, color: 'var(--teal)' });
  if (flow.failed > 0) links.push({ source: 'total', target: 'failed', value: flow.failed, color: '#666' });

  if (flow.phishing_email > 0) links.push({ source: 'completed', target: 'phishing', value: flow.phishing_email, color: 'var(--pink)' });
  if (flow.smishing > 0) links.push({ source: 'completed', target: 'smishing', value: flow.smishing, color: 'var(--pink-bright)' });
  if (flow.spam > 0) links.push({ source: 'completed', target: 'spam', value: flow.spam, color: 'var(--yellow)' });
  if (flow.legitimate > 0) links.push({ source: 'completed', target: 'legitimate', value: flow.legitimate, color: 'var(--teal)' });
  if (flow.unknown > 0) links.push({ source: 'completed', target: 'unknown', value: flow.unknown, color: '#666' });

  // Classification → Decision Path
  const threatTotal = flow.phishing_email + flow.smishing;
  const huntPathTotal = flow.autoHunted + flow.hitlApproved + flow.hitlSkipped;

  if (flow.autoHunted > 0 && threatTotal > 0) {
    const phishShare = flow.phishing_email / (threatTotal || 1);
    links.push({ source: 'phishing', target: 'auto_hunted', value: Math.round(flow.autoHunted * phishShare), color: 'var(--teal-bright, #5eead4)' });
    links.push({ source: 'smishing', target: 'auto_hunted', value: Math.round(flow.autoHunted * (1 - phishShare)), color: 'var(--teal-bright, #5eead4)' });
  }

  if (flow.hitlApproved > 0 && threatTotal > 0) {
    const phishShare = flow.phishing_email / (threatTotal || 1);
    links.push({ source: 'phishing', target: 'hitl_approved', value: Math.round(flow.hitlApproved * phishShare), color: 'var(--yellow, #fbbf24)' });
    links.push({ source: 'smishing', target: 'hitl_approved', value: Math.round(flow.hitlApproved * (1 - phishShare)), color: 'var(--yellow, #fbbf24)' });
  }

  if (flow.hitlSkipped > 0 && threatTotal > 0) {
    const phishShare = flow.phishing_email / (threatTotal || 1);
    links.push({ source: 'phishing', target: 'hitl_skipped', value: Math.round(flow.hitlSkipped * phishShare), color: '#888' });
    links.push({ source: 'smishing', target: 'hitl_skipped', value: Math.round(flow.hitlSkipped * (1 - phishShare)), color: '#888' });
  }

  if (flow.noHunt > 0) {
    // "No Hunt" comes from safe classifications + any remaining threats
    const threatNoHunt = Math.max(0, threatTotal - huntPathTotal);
    if (threatNoHunt > 0 && flow.phishing_email > 0) {
      const phishShare = flow.phishing_email / (threatTotal || 1);
      links.push({ source: 'phishing', target: 'no_hunt', value: Math.round(threatNoHunt * phishShare), color: '#555' });
      if (flow.smishing > 0) links.push({ source: 'smishing', target: 'no_hunt', value: Math.round(threatNoHunt * (1 - phishShare)), color: '#555' });
    }
    if (flow.spam > 0) links.push({ source: 'spam', target: 'no_hunt', value: flow.spam, color: '#555' });
    if (flow.legitimate > 0) links.push({ source: 'legitimate', target: 'no_hunt', value: flow.legitimate, color: '#555' });
    if (flow.unknown > 0) links.push({ source: 'unknown', target: 'no_hunt', value: flow.unknown, color: '#555' });
  }

  // Decision Path → Outcome
  if (flow.autoHunted > 0) links.push({ source: 'auto_hunted', target: 'hunted', value: flow.autoHunted, color: 'var(--teal-bright)' });
  if (flow.hitlApproved > 0) links.push({ source: 'hitl_approved', target: 'hunted', value: flow.hitlApproved, color: 'var(--teal-bright)' });
  if (flow.hitlSkipped > 0) links.push({ source: 'hitl_skipped', target: 'not_hunted', value: flow.hitlSkipped, color: '#555' });
  if (flow.noHunt > 0) links.push({ source: 'no_hunt', target: 'not_hunted', value: flow.noHunt, color: '#555' });

  return links.filter(l => l.value > 0);
}

function bezierPath(
  x1: number, y1: number, h1: number,
  x2: number, y2: number, h2: number,
  linkWidth: number
): string {
  const sy = y1 + h1 / 2;
  const ey = y2 + h2 / 2;
  const sx = x1 + NODE_WIDTH;
  const ex = x2;
  const cp = (ex - sx) * 0.5;
  const halfW = linkWidth / 2;

  return [
    `M ${sx} ${sy - halfW}`,
    `C ${sx + cp} ${sy - halfW}, ${ex - cp} ${ey - halfW}, ${ex} ${ey - halfW}`,
    `L ${ex} ${ey + halfW}`,
    `C ${ex - cp} ${ey + halfW}, ${sx + cp} ${sy + halfW}, ${sx} ${sy + halfW}`,
    'Z',
  ].join(' ');
}

function buildMultiSegmentFishPath(nodes: SankeyNode[]): string {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  const col0 = nodeMap['total'];
  if (!col0) return '';

  const col1 = nodeMap['completed'] || nodeMap['failed'];
  if (!col1) return '';

  const col2Nodes = nodes.filter(n =>
    ['phishing', 'smishing', 'spam', 'legitimate', 'unknown'].includes(n.id)
  );
  const col2 = col2Nodes.length > 0
    ? col2Nodes.reduce((best, n) => n.value > best.value ? n : best, col2Nodes[0])
    : null;

  const col3Nodes = nodes.filter(n =>
    ['auto_hunted', 'hitl_approved', 'hitl_skipped', 'no_hunt'].includes(n.id)
  );
  const col3 = col3Nodes.length > 0
    ? col3Nodes.reduce((best, n) => n.value > best.value ? n : best, col3Nodes[0])
    : null;

  const col4Nodes = nodes.filter(n => ['hunted', 'not_hunted'].includes(n.id));
  const col4 = col4Nodes.length > 0
    ? col4Nodes.reduce((best, n) => n.value > best.value ? n : best, col4Nodes[0])
    : null;

  const waypoints: { x: number; y: number }[] = [];

  waypoints.push({ x: col0.x + NODE_WIDTH, y: col0.y + col0.height / 2 });
  waypoints.push({ x: col1.x, y: col1.y + col1.height / 2 });

  if (col2) {
    waypoints.push({ x: col2.x, y: col2.y + col2.height / 2 });
  }
  if (col3) {
    waypoints.push({ x: col3.x, y: col3.y + col3.height / 2 });
  }
  if (col4) {
    waypoints.push({ x: col4.x, y: col4.y + col4.height / 2 });
  }

  if (waypoints.length < 2) return '';

  let d = `M ${waypoints[0].x} ${waypoints[0].y}`;
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const cp = (curr.x - prev.x) * 0.5;
    d += ` C ${prev.x + cp} ${prev.y}, ${curr.x - cp} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  return d;
}

export default function SankeyDiagram({ flowData }: { flowData: FlowData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 700, height: SVG_HEIGHT });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setDims({ width: Math.max(400, width), height: SVG_HEIGHT });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { setMounted(true); }, []);

  if (flowData.total === 0) return null;

  const nodes = buildNodes(flowData, dims.width, dims.height);
  const links = buildLinks(flowData);

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const sourceOffsets: Record<string, number> = {};
  const targetOffsets: Record<string, number> = {};

  const fishPath = buildMultiSegmentFishPath(nodes);

  const renderedLinks = links.map((link, i) => {
    const src = nodeMap[link.source];
    const tgt = nodeMap[link.target];
    if (!src || !tgt) return null;

    const srcTotal = links.filter(l => l.source === link.source).reduce((s, l) => s + l.value, 0) || 1;
    const tgtTotal = links.filter(l => l.target === link.target).reduce((s, l) => s + l.value, 0) || 1;
    const linkWidthSrc = (link.value / srcTotal) * src.height * 0.8;
    const linkWidthTgt = (link.value / tgtTotal) * tgt.height * 0.8;
    const linkWidth = Math.max(2, Math.min(linkWidthSrc, linkWidthTgt));

    const sOff = sourceOffsets[link.source] ?? 0;
    const tOff = targetOffsets[link.target] ?? 0;
    sourceOffsets[link.source] = sOff + linkWidth + 1;
    targetOffsets[link.target] = tOff + linkWidth + 1;

    const adjustedSrc = { ...src, y: src.y + sOff + (src.height * 0.1) };
    const adjustedTgt = { ...tgt, y: tgt.y + tOff + (tgt.height * 0.1) };

    const d = bezierPath(
      adjustedSrc.x, adjustedSrc.y, linkWidth,
      adjustedTgt.x, adjustedTgt.y, linkWidth,
      linkWidth
    );

    return (
      <path
        key={i}
        d={d}
        fill={link.color}
        opacity={0.4}
        filter="url(#sankey-path-glow)"
        className="sankey-flow-path"
        style={mounted ? {
          strokeDasharray: dims.width,
          strokeDashoffset: 0,
          animation: `sankey-reveal 1.2s ease-out ${i * 0.06}s both, sankey-pulse 3.5s ease-in-out ${i * 0.3}s infinite`,
        } : undefined}
      />
    );
  });

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg
        width={dims.width}
        height={dims.height}
        viewBox={`0 0 ${dims.width} ${dims.height}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <filter id="sankey-node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix in="blur" type="saturate" values="2" result="saturated" />
            <feMerge>
              <feMergeNode in="saturated" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="sankey-path-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="fish-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Links */}
        {renderedLinks}

        {/* Nodes */}
        {nodes.map(node => {
          const isCol2 = ['phishing', 'smishing', 'spam', 'legitimate', 'unknown'].includes(node.id);
          const isCol3 = ['auto_hunted', 'hitl_approved', 'hitl_skipped', 'no_hunt'].includes(node.id);
          const labelText = node.label;
          const countText = String(node.value);

          if (isCol2 || isCol3) {
            const labelX = node.x - 6;
            const labelY = node.y + node.height / 2;

            return (
              <g key={node.id}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={NODE_WIDTH}
                  height={node.height}
                  rx={NODE_RADIUS}
                  fill={node.color}
                  opacity={0.95}
                  filter="url(#sankey-node-glow)"
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="end"
                  dominantBaseline="central"
                  fill="var(--text, #fff)"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  letterSpacing="0.04em"
                >
                  {labelText}
                </text>
                <text
                  x={node.x + NODE_WIDTH + 5}
                  y={labelY}
                  textAnchor="start"
                  dominantBaseline="central"
                  fill="#fff"
                  fontSize="11"
                  fontFamily="var(--font-mono)"
                  fontWeight="800"
                  opacity="0.9"
                >
                  {countText}
                </text>
              </g>
            );
          }

          const labelX = node.x + NODE_WIDTH / 2;
          const labelY = node.y - LABEL_GAP;
          const labelWidth = labelText.length * 6.5 + 14;

          return (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width={NODE_WIDTH}
                height={node.height}
                rx={NODE_RADIUS}
                fill={node.color}
                opacity={0.95}
                filter="url(#sankey-node-glow)"
              />
              <rect
                x={labelX - labelWidth / 2}
                y={labelY - 12}
                width={labelWidth}
                height={16}
                rx={4}
                fill="var(--bg-deep, #0a0618)"
                opacity="0.9"
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--text, #fff)"
                fontSize="10"
                fontFamily="var(--font-mono)"
                letterSpacing="0.04em"
              >
                {labelText}
              </text>
              <text
                x={node.x + NODE_WIDTH / 2}
                y={node.y + node.height / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
                fontSize="13"
                fontFamily="var(--font-mono)"
                fontWeight="800"
              >
                {countText}
              </text>
            </g>
          );
        })}

        {/* Anglerfish easter egg */}
        {mounted && fishPath && (
          <g opacity="0.7" filter="url(#fish-glow)">
            <path id="fish-swim-path" d={fishPath} fill="none" stroke="none" />
            <g>
              <animateMotion
                dur="11s"
                repeatCount="indefinite"
                rotate="auto"
              >
                <mpath href="#fish-swim-path" />
              </animateMotion>
              {/* Anglerfish body */}
              <path
                d="M -4 0 C -4 -2.5, -1 -3.5, 2 -2.5 C 4 -1.5, 5 -0.5, 5 0 C 5 0.5, 4 1.5, 2 2.5 C -1 3.5, -4 2.5, -4 0 Z"
                fill="#1a1a2e"
                stroke="var(--teal-bright, #5eead4)"
                strokeWidth="0.5"
                opacity="0.8"
              />
              {/* Tail fin */}
              <path
                d="M -4 0 L -6.5 -2 L -6 0 L -6.5 2 Z"
                fill="var(--teal-bright, #5eead4)"
                opacity="0.5"
              />
              {/* Lure stalk */}
              <path
                d="M 2 -2.5 C 3 -4.5, 4.5 -5, 5 -5"
                fill="none"
                stroke="var(--yellow, #fbbf24)"
                strokeWidth="0.4"
                opacity="0.7"
              />
              {/* Lure glow dot */}
              <circle
                cx="5"
                cy="-5"
                r="1.2"
                fill="var(--yellow, #fbbf24)"
                opacity="0.9"
              >
                <animate
                  attributeName="opacity"
                  values="0.5;1;0.5"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="r"
                  values="1;1.4;1"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              </circle>
              {/* Eye */}
              <circle cx="3" cy="-0.5" r="0.6" fill="#fff" opacity="0.9" />
            </g>
          </g>
        )}
      </svg>

      <style>{`
        @keyframes sankey-reveal {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 0.4; transform: translateX(0); }
        }
        @keyframes sankey-pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
