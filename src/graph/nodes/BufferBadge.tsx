// graph/nodes/BufferBadge.tsx

import s from '@/styles/node.module.scss';

export default function BufferBadge({ count }: { count: number }) {
  return <span className={s.badge}>{count}</span>;
}
