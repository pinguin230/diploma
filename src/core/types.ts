// src/core/types.ts

export type NodeId = string;
export type PortId = string;

export type Complex = { re: number; im: number };

export type Token = {
  id: string;
  value: number | Complex;
  t: number; // логічний час надходження
  originT: number;
};

export type Edge = {
  id: string;
  from: { node: NodeId; port: PortId };
  to: { node: NodeId; port: PortId };
  delay?: number; // затримка каналу (мс симуляції)
  label?: string; // ← ТЕКСТ НА РЕБРІ
  labelValue?: Complex; // ← числове значення (для тултіпу)
};

export type NodeSpec = {
  id: NodeId;
  kind: NodeKind;
  inPorts: PortId[];
  outPorts: PortId[];
  latency: number; // скільки мс займає обчислення
  state?: Record<string, unknown>;

  params?: {
    twiddle?: { N: number; k: number };
  };
};

export type Graph = {
  nodes: NodeSpec[];
  edges: Edge[];
};

export type FireResult = {
  outputs: Record<PortId, Token>;
};

export type NodeKind = 'source' | 'sink' | 'add' | 'mul' | 'butterfly' | 'dft4' | 'twiddle';