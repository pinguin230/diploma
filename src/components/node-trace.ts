export type C = { re: number; im: number };

function cAdd(a: C, b: C): C {
  return { re: a.re + b.re, im: a.im + b.im };
}

function cSub(a: C, b: C): C {
  return { re: a.re - b.re, im: a.im - b.im };
}

function cMul(a: C, b: C): C {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

function cMulJ(a: C): C {
  return { re: -a.im, im: a.re };
}

function fmt(c: C, digits = 3): string {
  const re = c.re.toFixed(digits);
  const sign = c.im >= 0 ? '+' : '-';
  const im = Math.abs(c.im).toFixed(digits);
  return `(${re} ${sign} ${im}j)`;
}

export function parseInput(v: any): C | null {
  if (!v) return null;
  const re = v.value?.re ?? v.re;
  const im = v.value?.im ?? v.im;
  if (typeof re !== 'number' || typeof im !== 'number') return null;
  return { re, im };
}

export type TraceResult =
  | { kind: 'ready'; math: string; note?: string }
  | { kind: 'missing'; message: string };

export function traceDft4(inputs: Record<string, any> | null | undefined): TraceResult {
  const x0 = parseInput(inputs?.in0);
  const x1 = parseInput(inputs?.in1);
  const x2 = parseInput(inputs?.in2);
  const x3 = parseInput(inputs?.in3);
  if (!x0 || !x1 || !x2 || !x3) {
    return {
      kind: 'missing',
      message: 'Tokens not delivered to all inputs yet. Run the simulation to see the live trace.',
    };
  }

  const E0 = cAdd(x0, x2);
  const E1 = cSub(x0, x2);
  const O0 = cAdd(x1, x3);
  const O1 = cSub(x1, x3);
  const jO1 = cMulJ(O1);
  const X0 = cAdd(E0, O0);
  const X1 = cSub(E1, jO1);
  const X2 = cSub(E0, O0);
  const X3 = cAdd(E1, jO1);

  const math = String.raw`\begin{aligned}
    E_0 &= x_0 + x_2 = ${fmt(x0)} + ${fmt(x2)} &&= \mathbf{${fmt(E0)}} \\
    E_1 &= x_0 - x_2 = ${fmt(x0)} - ${fmt(x2)} &&= \mathbf{${fmt(E1)}} \\
    O_0 &= x_1 + x_3 = ${fmt(x1)} + ${fmt(x3)} &&= \mathbf{${fmt(O0)}} \\
    O_1 &= x_1 - x_3 = ${fmt(x1)} - ${fmt(x3)} &&= \mathbf{${fmt(O1)}} \\[6pt]
    X_0 &= E_0 + O_0   &&= \mathbf{${fmt(X0)}} \\
    X_1 &= E_1 - j\,O_1 &&= \mathbf{${fmt(X1)}} \\
    X_2 &= E_0 - O_0   &&= \mathbf{${fmt(X2)}} \\
    X_3 &= E_1 + j\,O_1 &&= \mathbf{${fmt(X3)}}
  \end{aligned}`;

  return {
    kind: 'ready',
    math,
    note: 'Butterfly: 8 complex adds, 0 nontrivial multiplications (j-swaps are free).',
  };
}

export function traceTwiddle(
  inputs: Record<string, any> | null | undefined,
  N: number | undefined,
  k: number | undefined,
): TraceResult {
  if (typeof N !== 'number' || typeof k !== 'number') {
    return { kind: 'missing', message: 'Twiddle factor (N, k) not set on this node.' };
  }
  const x = parseInput(inputs?.in);
  if (!x) {
    return {
      kind: 'missing',
      message: 'Input token not delivered yet. Run the simulation to see the live trace.',
    };
  }

  const angle = (-2 * Math.PI * k) / N;
  const W: C = { re: Math.cos(angle), im: Math.sin(angle) };
  const y = cMul(x, W);

  const math = String.raw`\begin{aligned}
    W &= W_{${N}}^{${k}} = e^{-j\,2\pi \cdot ${k}/${N}} = \cos\!\left(\tfrac{-2\pi\,${k}}{${N}}\right) + j\sin\!\left(\tfrac{-2\pi\,${k}}{${N}}\right) \\
      &= \mathbf{${fmt(W, 4)}} \\[6pt]
    y &= x \cdot W = ${fmt(x)} \cdot ${fmt(W, 4)} \\
      &= \mathbf{${fmt(y)}}
  \end{aligned}`;

  return {
    kind: 'ready',
    math,
    note: `Cost: 4 real muls + 2 real adds (or 3 muls + 5 adds in the alternative form).`,
  };
}

export function traceSource(outputs: Record<string, any> | null | undefined): TraceResult {
  const out = parseInput(outputs?.out);
  if (!out) {
    return {
      kind: 'missing',
      message: 'Source has not emitted yet. Apply a preset or edit Re/Im on the node.',
    };
  }
  const math = String.raw`x(n) = \mathbf{${fmt(out)}}`;
  return {
    kind: 'ready',
    math,
    note: 'Source emits a constant complex token as a time-domain sample x(n).',
  };
}

export function traceSink(inputs: Record<string, any> | null | undefined): TraceResult {
  const x = parseInput(inputs?.in);
  if (!x) {
    return {
      kind: 'missing',
      message: 'Sink has not received a spectrum bin yet.',
    };
  }
  const mag = Math.hypot(x.re, x.im);
  const phase = (Math.atan2(x.im, x.re) * 180) / Math.PI;
  const math = String.raw`\begin{aligned}
    X(k) &= \mathbf{${fmt(x)}} \\[4pt]
    |X(k)| &= \mathbf{${mag.toFixed(4)}} \\
    \angle X(k) &= \mathbf{${phase.toFixed(2)}^{\circ}}
  \end{aligned}`;
  return {
    kind: 'ready',
    math,
    note: 'Sink records the spectral bin X(k); magnitude and phase are computed at display time.',
  };
}
