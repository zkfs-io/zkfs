/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable id-length */
import { Circuit, UInt64 } from 'snarkyjs';

/**
 * Subtracts two 64-bit unsigned integers and returns the result.
 * Avoids underflow by returning 0 if b is greater than a.
 *
 * @param {UInt64} a - The Minuend
 * @param {UInt64} b - The Subtrahend
 * @returns The result of the subtraction.
 */
function safeUint64Sub(a: UInt64, b: UInt64) {
  const adjustedForUnderflow = Circuit.if(a.lessThan(b), b, a);
  return adjustedForUnderflow.sub(b);
}

/**
 * If dividing by zero, return 0, otherwise return the result of the division.
 *
 * @param {UInt64} a - The dividend
 * @param {UInt64} b - The divisor
 * @returns The result of the division.
 */
function safeUint64Div(a: UInt64, b: UInt64) {
  const dividingWithZero = b.equals(UInt64.from(0));
  const dividend = Circuit.if(dividingWithZero, UInt64.from(0), a);
  const divisor = Circuit.if(dividingWithZero, UInt64.from(1), b);
  return dividend.div(divisor);
}

export { safeUint64Sub, safeUint64Div };
