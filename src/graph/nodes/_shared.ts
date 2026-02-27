// graph/nodes/_shared.ts

import { useSimStore } from '@/store/simStore';

export function useHeatClass(nodeId: string) {
  const v = useSimStore((s) => s.nodeActivity[nodeId] ?? 0);
  // нормалізація/квантизація (підбери пороги під себе)
  const lvl = v > 12 ? 4 : v > 6 ? 3 : v > 3 ? 2 : v > 0.5 ? 1 : 0;
  return `heat${lvl}`;
}
