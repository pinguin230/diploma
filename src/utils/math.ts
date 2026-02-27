// src/utils/math.ts
import { Complex } from '../core/types';

export const cplxAdd = (a: Complex, b: Complex): Complex => ({
  re: a.re + b.re,
  im: a.im + b.im,
});

export const cplxSub = (a: Complex, b: Complex): Complex => ({
  re: a.re - b.re,
  im: a.im - b.im,
});

// Множення на j: (re + im*j) * j = -im + re*j
export const cplxMulJ = (a: Complex): Complex => ({
  re: -a.im,
  im: a.re,
});

// Швидке 4-точкове ДПФ на основі C-коду з Вашого завдання
export function computeDFT4(x0: Complex, x1: Complex, x2: Complex, x3: Complex): Complex[] {
  // E0 = x0 + x2
  const E0 = cplxAdd(x0, x2);
  // E1 = x0 - x2
  const E1 = cplxSub(x0, x2);
  // O0 = x1 + x3
  const O0 = cplxAdd(x1, x3);
  // O1 = x1 - x3
  const O1 = cplxSub(x1, x3);

  // X0 = E0 + O0
  const X0 = cplxAdd(E0, O0);
  // X2 = E0 - O0
  const X2 = cplxSub(E0, O0);

  // X1 = E1 - j*O1
  const jO1 = cplxMulJ(O1);
  const X1 = cplxSub(E1, jO1);
  // X3 = E1 + j*O1
  const X3 = cplxAdd(E1, jO1);

  return [X0, X1, X2, X3];
}