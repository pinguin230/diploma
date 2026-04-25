import clsx from 'clsx';
import { useSimStore } from '@/store/simStore';
import p from '@/styles/panels.module.scss';
import ui from '@/styles/ui.module.scss';

function fmt(x: number, d = 1) {
  return Number.isFinite(x) ? x.toFixed(d) : (0).toFixed(d);
}

export default function Metrics() {
  const running = useSimStore((s) => s.running);
  const throughputFps = useSimStore((s) => s.metrics.throughputFps);
  const latencyEmaMs = useSimStore((s) => s.metrics.latencyEmaMs);
  const queueEma = useSimStore((s) => s.metrics.queueEma);

  return (
    <section className={p.panel}>
      <div className={p.panelHeader}>
        <span>Dataflow metrics</span>
        <span className={clsx(ui.badge, running ? ui.badgeSuccess : ui.badgeMuted)}>
          <span className={ui.dot} />
          {running ? 'live' : 'idle'}
        </span>
      </div>
      <div className={p.panelBody}>
        <div className={p.metricGrid}>
          <div className={p.metric}>
            <span className={p.metricLabel}>Fires / s</span>
            <span className={p.metricValue}>{fmt(throughputFps, 1)}</span>
          </div>
          <div className={p.metric}>
            <span className={p.metricLabel}>Latency (ms)</span>
            <span className={p.metricValue}>{fmt(latencyEmaMs, 0)}</span>
          </div>
          <div className={p.metric}>
            <span className={p.metricLabel}>Avg queue</span>
            <span className={p.metricValue}>{fmt(queueEma, 2)}</span>
          </div>
        </div>

        <div className={p.complexityRow}>
          <div className={clsx(p.complexityCard, p.complexityCardDirect)}>
            <strong>Direct DFT · O(N²)</strong>
            <div>
              <code>256</code> complex muls
            </div>
            <div>
              <code>240</code> complex adds
            </div>
          </div>
          <div className={clsx(p.complexityCard, p.complexityCardFast)}>
            <strong>radix-4 · O(N log N)</strong>
            <div>
              <code>9</code> nontrivial muls
            </div>
            <div>
              <code>80</code> complex adds
            </div>
          </div>
        </div>
        <p className={p.complexityFoot}>
          4-point DFTs use only additions and j-swaps — multiplicative cost drops ≈28×.
        </p>
      </div>
    </section>
  );
}
