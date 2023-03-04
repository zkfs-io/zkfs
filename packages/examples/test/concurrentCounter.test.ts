/* eslint-disable jest/consistent-test-it */
/* eslint-disable no-console */
/* eslint-disable jest/require-top-level-describe */

import { AccountUpdate, UInt64 } from 'snarkyjs';

import ConcurrentCounter from './concurrentCounter.js';
import describeContract from './describeContract.js';

// eslint-disable-next-line jest/require-hook
describeContract<ConcurrentCounter>(
  'concurrentCounter',
  ConcurrentCounter,
  (context) => {
    async function localDeploy() {
      const {
        deployerAccount,
        deployerKey,
        zkAppPrivateKey,
        zkApp,
        contractApi,
      } = context();

      const tx = await contractApi.transaction(zkApp, deployerAccount, () => {
        AccountUpdate.fundNewAccount(deployerAccount);
        zkApp.deploy();
      });
      await tx.prove();

      // this tx needs .sign(), because `deploy()` adds an account update
      // that requires signature authorization
      await tx.sign([deployerKey, zkAppPrivateKey]).send();
      return tx;
    }

    it('correctly updates the count state on the `ConcurrentCounter` smart contract', async () => {
      expect.assertions(1);

      const { senderAccount, senderKey, zkApp, contractApi } = context();

      const tx0 = await localDeploy();

      console.log(
        'ConcurrentCounter.deploy() successful, initial offchain state:',
        {
          offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
          data: zkApp.virtualStorage?.data[zkApp.address.toBase58()],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          tx: tx0.toPretty(),
        }
      );

      console.log('ConcurrentCounter.increment(), dispatching an action...');

      const tx1 = await contractApi.transaction(zkApp, senderAccount, () => {
        zkApp.increment(UInt64.from(0), UInt64.from(1));
        zkApp.increment(UInt64.from(0), UInt64.from(1));
      });

      await tx1.prove();
      await tx1.sign([senderKey]).send();

      console.log('ConcurrentCounter.rollup(), rolling up actions...', {
        counters:
          zkApp.counters.contract?.virtualStorage?.data[
            zkApp.address.toBase58()
          ],
      });

      const tx2 = await contractApi.transaction(zkApp, senderAccount, () => {
        zkApp.rollup();
      });

      await tx2.prove();
      await tx2.sign([senderKey]).send();

      console.log(
        'ConcurrentCounter.rollup() successful, new offchain state:',
        {
          offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
          data: zkApp.virtualStorage?.data[zkApp.address.toBase58()],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          tx: tx2.toPretty(),
        }
      );

      expect(zkApp.getCounter(UInt64.from(0))[0].toString()).toBe('2');
    });
  }
);
