// core/buffers.ts

export class FIFO<T> {
  private q: T[] = [];
  push(v: T) {
    this.q.push(v);
  }
  peek(): T | undefined {
    return this.q[0];
  }
  pop(): T | undefined {
    return this.q.shift();
  }
  size() {
    return this.q.length;
  }
  clear() {
    this.q.length = 0;
  }
}
