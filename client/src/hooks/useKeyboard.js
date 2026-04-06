import { useEffect, useRef } from 'react';

const SPEED = 4;

const KEYS = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  w: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  a: { dx: -1, dy: 0 },
  d: { dx: 1, dy: 0 },
  W: { dx: 0, dy: -1 },
  S: { dx: 0, dy: 1 },
  A: { dx: -1, dy: 0 },
  D: { dx: 1, dy: 0 },
};

export function useKeyboard() {
  const pressedKeys = useRef(new Set());

  useEffect(() => {
    const onDown = (e) => {
      if (KEYS[e.key]) {
        e.preventDefault();
        pressedKeys.current.add(e.key);
      }
    };
    const onUp = (e) => pressedKeys.current.delete(e.key);

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  /**
   * Returns { dx, dy } velocity vector based on currently pressed keys.
   * Normalized to prevent diagonal speed advantage.
   */
  function getVelocity() {
    let dx = 0, dy = 0;
    for (const key of pressedKeys.current) {
      if (KEYS[key]) {
        dx += KEYS[key].dx;
        dy += KEYS[key].dy;
      }
    }
    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
      const factor = 1 / Math.sqrt(2);
      dx *= factor;
      dy *= factor;
    }
    return { dx: dx * SPEED, dy: dy * SPEED };
  }

  return { getVelocity, pressedKeys };
}
