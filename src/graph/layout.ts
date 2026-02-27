// graph/layout.ts

import type { Graph } from '@/core/types';

export function layoutRadix2(
  g: Graph,
  N: number,
  opts?: {
    left?: number;
    top?: number;
    stageGap?: number;
    rowGap?: number;
    colPad?: number;
  },
) {
  const m = Math.log2(N);
  const left = opts?.left ?? 80;
  const top = opts?.top ?? 40;
  const stageGap = opts?.stageGap ?? 180;
  const rowGap = opts?.rowGap ?? 80;
  const colPad = opts?.colPad ?? 50;

  const colX = (col: number) => left + col * stageGap + col * colPad;

  return g.nodes.map((n) => {
    let col = 0,
      row = 0;
    if (n.id.startsWith('src')) {
      col = 0;
      row = parseInt(n.id.slice(3), 10);
    } else if (n.id.startsWith('b_')) {
      const [, s, a] = n.id.split('_');
      col = 1 + Number(s);
      row = Number(a);
    } else if (n.id.startsWith('snk')) {
      col = 1 + m;
      row = parseInt(n.id.slice(3), 10);
    }
    return { id: n.id, type: n.kind, position: { x: colX(col), y: top + row * rowGap }, data: {} };
  });
}
