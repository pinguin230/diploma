import { describe, it, expect } from 'vitest';
import { cplxAdd, cplxSub, cplxMulJ, computeDFT4 } from './math';

const EPS = 1e-9;
const near = (a: number, b: number) => Math.abs(a - b) < EPS;

describe('cplxAdd', () => {
  it('adds real parts', () => {
    expect(cplxAdd({ re: 1, im: 0 }, { re: 2, im: 0 })).toMatchObject({ re: 3, im: 0 });
  });
  it('adds imaginary parts', () => {
    expect(cplxAdd({ re: 0, im: 3 }, { re: 0, im: 4 })).toMatchObject({ re: 0, im: 7 });
  });
  it('adds general complex numbers', () => {
    expect(cplxAdd({ re: 1, im: 2 }, { re: -1, im: -2 })).toMatchObject({ re: 0, im: 0 });
  });
});

describe('cplxSub', () => {
  it('subtracts real parts', () => {
    expect(cplxSub({ re: 5, im: 0 }, { re: 3, im: 0 })).toMatchObject({ re: 2, im: 0 });
  });
  it('subtracts imaginary parts', () => {
    expect(cplxSub({ re: 0, im: 5 }, { re: 0, im: 3 })).toMatchObject({ re: 0, im: 2 });
  });
  it('handles negative results', () => {
    expect(cplxSub({ re: 1, im: 1 }, { re: 3, im: 4 })).toMatchObject({ re: -2, im: -3 });
  });
});

describe('cplxMulJ', () => {
  it('rotates real unit by j: 1 → j', () => {
    const r = cplxMulJ({ re: 1, im: 0 });
    expect(near(r.re, 0) && near(r.im, 1)).toBe(true);
  });
  it('rotates j by j: j → -1', () => {
    const r = cplxMulJ({ re: 0, im: 1 });
    expect(near(r.re, -1) && near(r.im, 0)).toBe(true);
  });
  it('rotates -1 by j: -1 → -j', () => {
    const r = cplxMulJ({ re: -1, im: 0 });
    expect(near(r.re, 0) && near(r.im, -1)).toBe(true);
  });
  it('rotates -j by j: -j → 1', () => {
    const r = cplxMulJ({ re: 0, im: -1 });
    expect(near(r.re, 1) && near(r.im, 0)).toBe(true);
  });
});

describe('computeDFT4', () => {
  it('DFT of impulse x=[1,0,0,0] is all ones', () => {
    const [X0, X1, X2, X3] = computeDFT4(
      { re: 1, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
    );
    expect(near(X0.re, 1) && near(X0.im, 0)).toBe(true);
    expect(near(X1.re, 1) && near(X1.im, 0)).toBe(true);
    expect(near(X2.re, 1) && near(X2.im, 0)).toBe(true);
    expect(near(X3.re, 1) && near(X3.im, 0)).toBe(true);
  });

  it('DFT of DC signal x=[1,1,1,1] has only bin 0', () => {
    // DC: X[0]=4, X[1..3]=0
    const [X0, X1, X2, X3] = computeDFT4(
      { re: 1, im: 0 },
      { re: 1, im: 0 },
      { re: 1, im: 0 },
      { re: 1, im: 0 },
    );
    expect(near(X0.re, 4) && near(X0.im, 0)).toBe(true);
    expect(near(X1.re, 0) && near(X1.im, 0)).toBe(true);
    expect(near(X2.re, 0) && near(X2.im, 0)).toBe(true);
    expect(near(X3.re, 0) && near(X3.im, 0)).toBe(true);
  });

  it('DFT of delayed impulse x=[0,1,0,0] shifts phase', () => {
    // X[k] = e^{-j*2*pi*k/4}; X[0]=1, X[1]=-j, X[2]=-1, X[3]=j
    const [X0, X1, X2, X3] = computeDFT4(
      { re: 0, im: 0 },
      { re: 1, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
    );
    expect(near(X0.re, 1) && near(X0.im, 0)).toBe(true);
    expect(near(X1.re, 0) && near(X1.im, -1)).toBe(true);
    expect(near(X2.re, -1) && near(X2.im, 0)).toBe(true);
    expect(near(X3.re, 0) && near(X3.im, 1)).toBe(true);
  });

  it('returns 4 output values', () => {
    const result = computeDFT4(
      { re: 1, im: 0 },
      { re: 2, im: 0 },
      { re: 3, im: 0 },
      { re: 4, im: 0 },
    );
    expect(result).toHaveLength(4);
  });

  it('is linear: DFT(a+b) = DFT(a) + DFT(b)', () => {
    const a = [{ re: 1, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }] as const;
    const b = [{ re: 0, im: 0 }, { re: 1, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }] as const;
    const sum = [{ re: 1, im: 0 }, { re: 1, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }] as const;

    const ra = computeDFT4(...a);
    const rb = computeDFT4(...b);
    const rs = computeDFT4(...sum);

    for (let k = 0; k < 4; k++) {
      expect(near(rs[k]!.re, ra[k]!.re + rb[k]!.re)).toBe(true);
      expect(near(rs[k]!.im, ra[k]!.im + rb[k]!.im)).toBe(true);
    }
  });
});
