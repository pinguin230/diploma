// compare/compare.ts

import FFT from 'fft.js';
import type { Complex, Graph } from '@/core/types';

export type CompareResult = {
  ref: Complex[];
  mismatches: Record<string, boolean>;
};

export function compareWithFFT(
  graph: Graph,
  lastInput: Record<string, Complex>,
  sinks: Record<string, string>,
  eps = 1e-9,
): CompareResult {
  const N = graph.nodes.filter((n) => n.kind === 'source').length; // очікуємо N=2^m
  const fft = new FFT(N);

  // зберемо вхідний вектор у порядку src0..srcN-1
  const x: Complex[] = Array.from({ length: N }, (_, i) => {
    const v = lastInput[`src${i}`];
    return v ?? { re: 0, im: 0 };
  });

  // transform
  const inp = fft.createComplexArray();
  const out = fft.createComplexArray();
  for (let i = 0; i < N; i++) {
    inp[2 * i] = x[i]!.re;
    inp[2 * i + 1] = x[i]!.im;
  }
  fft.transform(out, inp);

  const ref: Complex[] = Array.from({ length: N }, (_, k) => ({
    re: out[2 * k],
    im: out[2 * k + 1],
  }));

  // прочитаємо фактичні значення з Sink-ів у порядку snk0..snkN-1
  const mismatches: Record<string, boolean> = {};
  for (let k = 0; k < N; k++) {
    const sid = `snk${k}`;
    const s = sinks[sid];
    if (!s) {
      mismatches[sid] = true;
      continue;
    }

    let got: Complex;
    try {
      got = JSON.parse(s) as Complex;
    } catch {
      mismatches[sid] = true;
      continue;
    }

    const dRe = Math.abs(got.re - ref[k]!.re);
    const dIm = Math.abs(got.im - ref[k]!.im);
    mismatches[sid] = dRe > eps || dIm > eps;
  }

  return { ref, mismatches };
}
