# Safe Math Library for Snarkyjs

This npm package provides a safe math library for developers working with [Snarkyjs](https://github.com/o1-labs/snarkyjs/).
 
The library is designed to ensure that all math calculations are performed securely, without having to worry about potential security issues, such as underflows or division by zero.

# Quickstart

```
npm install @zkfs/safe-math
```

# Usage

```typescript
import { UInt64 } from 'snarkyjs';

// subtraction
safeUint64Sub(UInt64.from(2), UInt64.from(1)) // returns 1
safeUint64Sub(UInt64.from(1), UInt64.from(2)) // returns 0

// division
safeUint64Div(UInt64.from(10), UInt64.from(5)) // returns 2
safeUint64Div(UInt64.from(10), UInt64.from(0)) // returns 0
```