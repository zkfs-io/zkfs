/* eslint-disable id-length */
import { isReady, UInt64 } from 'snarkyjs';

import { safeUint64Div, safeUint64Sub } from './uint64.js';

describe('uint64', () => {
  beforeAll(async () => {
    await isReady;
  });

  describe('safe subtract without underflow', () => {
    const cases = [
      [2, 1, 1],
      [1, 1, 0],
      [1, 2, 0],
    ];

    it.each(cases)('given %p and %p, returns %p', (a, b, expectedResult) => {
      expect.assertions(1);

      const result = safeUint64Sub(UInt64.from(a), UInt64.from(b));

      expect(result).toStrictEqual(UInt64.from(expectedResult));
    });
  });

  describe('safe divide with zero', () => {
    const cases = [
      [10, 2, 5],
      [10, 0, 0],
      [0, 10, 0],
      [0, 0, 0],
    ];

    it.each(cases)('given %p and %p, returns %p', (a, b, expectedResult) => {
      expect.assertions(1);

      const result = safeUint64Div(UInt64.from(a), UInt64.from(b));

      expect(result).toStrictEqual(UInt64.from(expectedResult));
    });
  });
});
