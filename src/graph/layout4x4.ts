// src/graph/layout4x4.ts

import { Node as FlowNode } from '@xyflow/react';
import type { Graph, NodeSpec } from '@/core/types';

export type LayoutOptions = {
  stageGap?: number; // Відстань між етапами (по X)
  rowGap?: number;   // Відстань між елементами (по Y)
};

export function layoutDFT4x4(
    graph: Graph,
    options: LayoutOptions = {}
): FlowNode[] {
  // Налаштування відстаней за замовчуванням
  const { stageGap = 280, rowGap = 65 } = options;

  return graph.nodes.map((node: NodeSpec): FlowNode => {
    let x = 0;
    let y = 0;
    let label = node.id;

    // Розбираємо id вузла, наприклад "tw-2-3" -> ['tw', '2', '3']
    const parts = node.id.split('-');

    if (node.id.startsWith('src')) {
      const i = parseInt(node.id.replace('src', ''), 10);
      x = 0;
      y = i * rowGap;
      label = `x[${i}]`;
    }
    else if (node.id.startsWith('row-')) {
      const n1 = parseInt(parts[1], 10);
      x = stageGap;
      // Відцентруємо 4 вузли ДПФ відносно 16 рядків
      y = (n1 * 4 + 1.5) * rowGap;
      label = `Row-DFT ${n1}`;
    }
    else if (node.id.startsWith('tw-')) {
      const n1 = parseInt(parts[1], 10);
      const k2 = parseInt(parts[2], 10);
      x = stageGap * 2;
      // Вузли множників розташовані поспіль по 16 у стовпець
      y = (n1 * 4 + k2) * rowGap;
      const power = n1 * k2;
      label = power > 0 ? `W¹⁶_${power}` : 'W¹⁶_0 (1)';
    }
    else if (node.id.startsWith('col-')) {
      const k2 = parseInt(parts[1], 10);
      x = stageGap * 3;
      y = (k2 * 4 + 1.5) * rowGap;
      label = `Col-DFT ${k2}`;
    }
    else if (node.id.startsWith('snk')) {
      const i = parseInt(node.id.replace('snk', ''), 10);
      x = stageGap * 4;
      y = i * rowGap;
      label = `X[${i}]`;
    }

    return {
      id: node.id,
      type: node.kind,
      position: { x, y },
      data: {
        label,
        ...node.params
      },
    };
  });
}