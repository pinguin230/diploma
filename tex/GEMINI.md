# GEMINI.md — BKR FFT Teslja

Gemini CLI context file for the bachelor's thesis project.

## Project
Ukrainian bachelor's thesis: "Visual Modeling of a Dataflow-Driven FFT Processor"
Specialty 122 Computer Science, Lviv Polytechnic National University, 2025.

## My role when using Gemini CLI here
- Search for academic references (IEEE, Springer, arXiv)
- Check Ukrainian grammar in LaTeX text
- Provide DSTU GOST 7.1:2006 bibliographic entries
- Verify technical facts with Google Search grounding

## Key technical terms (Ukrainian ↔ English)
- Швидке перетворення Фур'є (ШПФ) = Fast Fourier Transform (FFT)
- Дискретне перетворення Фур'є (ДПФ) = Discrete Fourier Transform (DFT)
- Граф потоку даних (ДПФ/DFG) = Data Flow Graph
- Повертаючий множник (TF) = Twiddle Factor
- Керування потоком даних = Dataflow computing
- Radix-4 = метелик з основою 4

## Citation format needed
DSTU GOST 7.1:2006 (Ukrainian standard), example:
  Cooley J. W. An algorithm for the machine calculation / J. W. Cooley, J. W. Tukey //
  Mathematics of Computation. — 1965. — Vol. 19, № 90. — P. 297–301.

## Thesis structure (for context)
- Chapter 1: Literature review — FFT algorithms, dataflow computing, existing tools
- Chapter 2: DFG model — mathematical model, graph structure
- Chapter 3: Implementation — Next.js simulator (scheduler.ts, generateDFT4x4.ts)
- Chapter 4: Testing — verification against reference FFT, complexity analysis
