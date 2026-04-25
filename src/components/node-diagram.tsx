'use client';

import { parseInput, type C } from '@/components/node-trace';
import diag from '@/styles/diagram.module.scss';

function fmt(c: C | null): string {
  if (!c) return '—';
  const sign = c.im >= 0 ? '+' : '−';
  return `${c.re.toFixed(2)}${sign}${Math.abs(c.im).toFixed(2)}j`;
}

type NodePos = { x: number; y: number; label: string; value: string; key: string };
type Wire = {
  from: string;
  to: string;
  op: '+' | '−' | '+j' | '−j';
  kind: 'add' | 'sub' | 'j' | 'mj';
};

export function Dft4ButterflyDiagram({
  inputs,
}: {
  inputs: Record<string, any> | null | undefined;
}) {
  const x0 = parseInput(inputs?.in0);
  const x1 = parseInput(inputs?.in1);
  const x2 = parseInput(inputs?.in2);
  const x3 = parseInput(inputs?.in3);

  const havingInputs = !!(x0 && x1 && x2 && x3);

  // Intermediate / output values
  const E0 = havingInputs ? { re: x0!.re + x2!.re, im: x0!.im + x2!.im } : null;
  const E1 = havingInputs ? { re: x0!.re - x2!.re, im: x0!.im - x2!.im } : null;
  const O0 = havingInputs ? { re: x1!.re + x3!.re, im: x1!.im + x3!.im } : null;
  const O1 = havingInputs ? { re: x1!.re - x3!.re, im: x1!.im - x3!.im } : null;
  const jO1: C | null = O1 ? { re: -O1.im, im: O1.re } : null;
  const X0 = havingInputs && O0 ? { re: E0!.re + O0.re, im: E0!.im + O0.im } : null;
  const X1 =
    havingInputs && jO1 ? { re: E1!.re - jO1.re, im: E1!.im - jO1.im } : null;
  const X2 = havingInputs && O0 ? { re: E0!.re - O0.re, im: E0!.im - O0.im } : null;
  const X3 =
    havingInputs && jO1 ? { re: E1!.re + jO1.re, im: E1!.im + jO1.im } : null;

  // Layout
  const W = 380;
  const H = 280;
  const COL_X = [42, 190, 338];
  const ROW_Y = [36, 96, 184, 244];

  const nodes: NodePos[] = [
    { key: 'x0', x: COL_X[0], y: ROW_Y[0], label: 'x₀', value: fmt(x0) },
    { key: 'x1', x: COL_X[0], y: ROW_Y[1], label: 'x₁', value: fmt(x1) },
    { key: 'x2', x: COL_X[0], y: ROW_Y[2], label: 'x₂', value: fmt(x2) },
    { key: 'x3', x: COL_X[0], y: ROW_Y[3], label: 'x₃', value: fmt(x3) },

    { key: 'E0', x: COL_X[1], y: ROW_Y[0], label: 'E₀', value: fmt(E0) },
    { key: 'E1', x: COL_X[1], y: ROW_Y[1], label: 'E₁', value: fmt(E1) },
    { key: 'O0', x: COL_X[1], y: ROW_Y[2], label: 'O₀', value: fmt(O0) },
    { key: 'O1', x: COL_X[1], y: ROW_Y[3], label: 'O₁', value: fmt(O1) },

    { key: 'X0', x: COL_X[2], y: ROW_Y[0], label: 'X₀', value: fmt(X0) },
    { key: 'X1', x: COL_X[2], y: ROW_Y[1], label: 'X₁', value: fmt(X1) },
    { key: 'X2', x: COL_X[2], y: ROW_Y[2], label: 'X₂', value: fmt(X2) },
    { key: 'X3', x: COL_X[2], y: ROW_Y[3], label: 'X₃', value: fmt(X3) },
  ];

  const wires: Wire[] = [
    // stage 1 (even: x0, x2)
    { from: 'x0', to: 'E0', op: '+', kind: 'add' },
    { from: 'x2', to: 'E0', op: '+', kind: 'add' },
    { from: 'x0', to: 'E1', op: '+', kind: 'add' },
    { from: 'x2', to: 'E1', op: '−', kind: 'sub' },
    // stage 1 (odd: x1, x3)
    { from: 'x1', to: 'O0', op: '+', kind: 'add' },
    { from: 'x3', to: 'O0', op: '+', kind: 'add' },
    { from: 'x1', to: 'O1', op: '+', kind: 'add' },
    { from: 'x3', to: 'O1', op: '−', kind: 'sub' },
    // stage 2
    { from: 'E0', to: 'X0', op: '+', kind: 'add' },
    { from: 'O0', to: 'X0', op: '+', kind: 'add' },
    { from: 'E0', to: 'X2', op: '+', kind: 'add' },
    { from: 'O0', to: 'X2', op: '−', kind: 'sub' },
    { from: 'E1', to: 'X1', op: '+', kind: 'add' },
    { from: 'O1', to: 'X1', op: '−j', kind: 'mj' },
    { from: 'E1', to: 'X3', op: '+', kind: 'add' },
    { from: 'O1', to: 'X3', op: '+j', kind: 'j' },
  ];

  const byKey: Record<string, NodePos> = Object.fromEntries(nodes.map((n) => [n.key, n]));

  const NODE_W = 74;
  const NODE_H = 36;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={diag.svg} role="img" aria-label="DFT-4 butterfly diagram">
      {/* Wires first so they appear behind nodes */}
      <g className={diag.wires}>
        {wires.map((w, i) => {
          const from = byKey[w.from];
          const to = byKey[w.to];
          const x1 = from.x + NODE_W / 2;
          const y1 = from.y;
          const x2 = to.x - NODE_W / 2;
          const y2 = to.y;
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;

          return (
            <g key={i} className={diag[`wire_${w.kind}`]}>
              <path d={`M ${x1} ${y1} L ${x2} ${y2}`} className={diag.wirePath} />
              <g transform={`translate(${mx}, ${my})`}>
                <circle r="8" className={diag.opBubble} />
                <text className={diag.opText} dominantBaseline="central" textAnchor="middle">
                  {w.op}
                </text>
              </g>
            </g>
          );
        })}
      </g>

      {/* Nodes */}
      <g className={diag.nodes}>
        {nodes.map((n) => {
          const kind =
            n.key.startsWith('x') ? 'input' : n.key.startsWith('X') ? 'output' : 'mid';
          return (
            <g key={n.key} transform={`translate(${n.x - NODE_W / 2}, ${n.y - NODE_H / 2})`}>
              <rect
                width={NODE_W}
                height={NODE_H}
                rx="6"
                ry="6"
                className={`${diag.nodeRect} ${diag[`nodeRect_${kind}`]}`}
              />
              <text x={NODE_W / 2} y="12" className={diag.nodeLabel} textAnchor="middle">
                {n.label}
              </text>
              <text x={NODE_W / 2} y="26" className={diag.nodeValue} textAnchor="middle">
                {n.value}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function TwiddleDiagram({
  inputs,
  N,
  k,
}: {
  inputs: Record<string, any> | null | undefined;
  N?: number;
  k?: number;
}) {
  const x = parseInput(inputs?.in);
  let y: C | null = null;
  let w: C | null = null;
  if (x && typeof N === 'number' && typeof k === 'number') {
    const angle = (-2 * Math.PI * k) / N;
    w = { re: Math.cos(angle), im: Math.sin(angle) };
    y = { re: x.re * w.re - x.im * w.im, im: x.re * w.im + x.im * w.re };
  }

  const width = 380;
  const height = 120;
  const NODE_W = 96;
  const NODE_H = 40;
  const positions = {
    x: { x: 52, y: 60 },
    W: { x: 190, y: 60 },
    y: { x: 328, y: 60 },
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={diag.svg} role="img" aria-label="Twiddle diagram">
      <g className={diag.wires}>
        <path
          d={`M ${positions.x.x + NODE_W / 2} ${positions.x.y} L ${positions.W.x - NODE_W / 2} ${positions.W.y}`}
          className={`${diag.wirePath} ${diag.wire_add}`}
        />
        <path
          d={`M ${positions.W.x + NODE_W / 2} ${positions.W.y} L ${positions.y.x - NODE_W / 2} ${positions.y.y}`}
          className={`${diag.wirePath} ${diag.wire_add}`}
        />
        <g transform={`translate(${(positions.x.x + positions.W.x) / 2}, ${positions.W.y})`}>
          <circle r="9" className={diag.opBubble} />
          <text className={diag.opText} dominantBaseline="central" textAnchor="middle">
            ×
          </text>
        </g>
      </g>
      <g className={diag.nodes}>
        <NodeBox label="x" value={fmt(x)} x={positions.x.x} y={positions.x.y} kind="input" w={NODE_W} h={NODE_H} />
        <NodeBox
          label={typeof N === 'number' && typeof k === 'number' ? `W${sub(N)}${sup(k)}` : 'W'}
          value={fmt(w)}
          x={positions.W.x}
          y={positions.W.y}
          kind="mid"
          w={NODE_W}
          h={NODE_H}
        />
        <NodeBox label="y" value={fmt(y)} x={positions.y.x} y={positions.y.y} kind="output" w={NODE_W} h={NODE_H} />
      </g>
    </svg>
  );
}

function NodeBox({
  label,
  value,
  x,
  y,
  kind,
  w,
  h,
}: {
  label: string;
  value: string;
  x: number;
  y: number;
  kind: 'input' | 'output' | 'mid';
  w: number;
  h: number;
}) {
  return (
    <g transform={`translate(${x - w / 2}, ${y - h / 2})`}>
      <rect width={w} height={h} rx="6" ry="6" className={`${diag.nodeRect} ${diag[`nodeRect_${kind}`]}`} />
      <text x={w / 2} y="14" className={diag.nodeLabel} textAnchor="middle">
        {label}
      </text>
      <text x={w / 2} y="28" className={diag.nodeValue} textAnchor="middle">
        {value}
      </text>
    </g>
  );
}

const SUB_DIGITS = '₀₁₂₃₄₅₆₇₈₉';
const SUP_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
function sub(n: number) {
  return n.toString().split('').map((d) => SUB_DIGITS[Number(d)] ?? d).join('');
}
function sup(n: number) {
  return n.toString().split('').map((d) => SUP_DIGITS[Number(d)] ?? d).join('');
}
