import { describe, it, expect } from 'vitest';
import { parseInput, traceDft4, traceTwiddle, traceSource, traceSink } from './node-trace';

describe('parseInput', () => {
  it('returns null for falsy input', () => {
    expect(parseInput(null)).toBeNull();
    expect(parseInput(undefined)).toBeNull();
    expect(parseInput(0)).toBeNull();
  });

  it('parses flat {re, im} object', () => {
    expect(parseInput({ re: 1, im: 2 })).toMatchObject({ re: 1, im: 2 });
  });

  it('parses nested {value: {re, im}} object', () => {
    expect(parseInput({ value: { re: 3, im: -1 } })).toMatchObject({ re: 3, im: -1 });
  });

  it('returns null when re/im are not numbers', () => {
    expect(parseInput({ re: 'x', im: 'y' })).toBeNull();
  });
});

describe('traceDft4', () => {
  it('returns missing when inputs are absent', () => {
    const r = traceDft4(null);
    expect(r.kind).toBe('missing');
  });

  it('returns missing when some inputs lack values', () => {
    const r = traceDft4({ in0: { re: 1, im: 0 } });
    expect(r.kind).toBe('missing');
  });

  it('returns ready with math for complete inputs', () => {
    const inputs = {
      in0: { re: 1, im: 0 },
      in1: { re: 0, im: 0 },
      in2: { re: 0, im: 0 },
      in3: { re: 0, im: 0 },
    };
    const r = traceDft4(inputs);
    expect(r.kind).toBe('ready');
    if (r.kind === 'ready') {
      expect(r.math).toContain('E_0');
      expect(r.math).toContain('X_0');
      expect(r.note).toBeTruthy();
    }
  });

  it('substitutes actual values into the formula', () => {
    const inputs = {
      in0: { re: 2, im: 0 },
      in1: { re: 0, im: 0 },
      in2: { re: 0, im: 0 },
      in3: { re: 0, im: 0 },
    };
    const r = traceDft4(inputs);
    if (r.kind === 'ready') {
      expect(r.math).toContain('2.000');
    }
  });
});

describe('traceTwiddle', () => {
  it('returns missing when N/k are missing', () => {
    expect(traceTwiddle(null, undefined, undefined).kind).toBe('missing');
    expect(traceTwiddle({}, undefined, 1).kind).toBe('missing');
  });

  it('returns missing when input token is absent', () => {
    const r = traceTwiddle(null, 4, 1);
    expect(r.kind).toBe('missing');
  });

  it('returns ready for valid inputs', () => {
    const r = traceTwiddle({ in: { re: 1, im: 0 } }, 4, 1);
    expect(r.kind).toBe('ready');
    if (r.kind === 'ready') {
      expect(r.math).toContain('W_{4}^{1}');
    }
  });

  it('W_4^0 = 1, so output equals input', () => {
    const r = traceTwiddle({ in: { re: 2, im: 3 } }, 4, 0);
    expect(r.kind).toBe('ready');
    if (r.kind === 'ready') {
      expect(r.math).toContain('2.000');
      expect(r.math).toContain('3.000');
    }
  });
});

describe('traceSource', () => {
  it('returns missing when output is absent', () => {
    expect(traceSource(null).kind).toBe('missing');
    expect(traceSource({}).kind).toBe('missing');
  });

  it('returns ready when out token exists', () => {
    const r = traceSource({ out: { re: 1, im: 2 } });
    expect(r.kind).toBe('ready');
    if (r.kind === 'ready') {
      expect(r.math).toContain('x(n)');
    }
  });
});

describe('traceSink', () => {
  it('returns missing when in token is absent', () => {
    expect(traceSink(null).kind).toBe('missing');
    expect(traceSink({}).kind).toBe('missing');
  });

  it('returns ready with magnitude and phase', () => {
    const r = traceSink({ in: { re: 1, im: 0 } });
    expect(r.kind).toBe('ready');
    if (r.kind === 'ready') {
      expect(r.math).toContain('X(k)');
      expect(r.math).toContain('|X(k)|');
      // |1+0j| = 1.0000
      expect(r.math).toContain('1.0000');
    }
  });

  it('computes correct magnitude for 3+4j (magnitude=5)', () => {
    const r = traceSink({ in: { re: 3, im: 4 } });
    if (r.kind === 'ready') {
      expect(r.math).toContain('5.0000');
    }
  });
});
