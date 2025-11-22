import { describe, it } from 'vitest';
import * as fc from 'fast-check';

describe('Fast-check Setup', () => {
  it('should run property-based tests', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n + 0 === n;
      })
    );
  });

  it('should generate random strings', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        return s.length >= 0;
      })
    );
  });
});
