import { describe, it, expect } from 'vitest';
import { FIFO } from './buffers';

describe('FIFO', () => {
  it('starts empty', () => {
    const q = new FIFO<number>();
    expect(q.size()).toBe(0);
    expect(q.peek()).toBeUndefined();
    expect(q.pop()).toBeUndefined();
  });

  it('push increases size', () => {
    const q = new FIFO<number>();
    q.push(1);
    expect(q.size()).toBe(1);
    q.push(2);
    expect(q.size()).toBe(2);
  });

  it('peek returns head without removing', () => {
    const q = new FIFO<string>();
    q.push('a');
    q.push('b');
    expect(q.peek()).toBe('a');
    expect(q.size()).toBe(2);
  });

  it('pop removes and returns head (FIFO order)', () => {
    const q = new FIFO<number>();
    q.push(10);
    q.push(20);
    expect(q.pop()).toBe(10);
    expect(q.pop()).toBe(20);
    expect(q.size()).toBe(0);
  });

  it('clear resets queue', () => {
    const q = new FIFO<number>();
    q.push(1);
    q.push(2);
    q.push(3);
    q.clear();
    expect(q.size()).toBe(0);
    expect(q.peek()).toBeUndefined();
  });
});
