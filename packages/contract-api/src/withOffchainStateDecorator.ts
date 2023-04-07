/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { Circuit } from 'snarkyjs';

import type OffchainStateContract from './offchainStateContract.js';

function withOffchainState(
  target: OffchainStateContract,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const originalFunction = descriptor.value;

  const { offchainState } = Object.getPrototypeOf(target)
    .constructor as typeof OffchainStateContract;

  const { backup } = offchainState;

  function stateTrackingWrapper(...args: any[]) {
    // @ts-expect-error due to casting 'this'
    // eslint-disable-next-line @typescript-eslint/no-invalid-this
    const self = this as OffchainStateContract;

    // backup the initial state before the method
    Circuit.asProver(() => {
      backup.backupInitial(self);
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    originalFunction.apply(self, args);

    Circuit.asProver(() => {
      // save results of running the method
      backup.backupLatest(self);

      // reset the results of running the method using the initial state backup
      backup.restoreInitial(self);
    });
  }

  descriptor.value = stateTrackingWrapper;
}

export default withOffchainState;
