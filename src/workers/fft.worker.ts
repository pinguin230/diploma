// workers/fft.worker.ts

import * as Comlink from 'comlink';

export type C = { re: number; im: number };

function mul(a: C, b: C): C {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

const api = {
  applyTwiddle(x: C, tw: C): C {
    return mul(x, tw);
  },
};

Comlink.expose(api);
export type FFTWorkerAPI = typeof api;
