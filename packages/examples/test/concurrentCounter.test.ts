/* eslint-disable jest/consistent-test-it */
/* eslint-disable no-console */
/* eslint-disable jest/require-top-level-describe */
/* eslint-disable max-statements */
import { AccountUpdate, UInt64, MerkleMap, Poseidon } from 'snarkyjs';
import { Key } from '@zkfs/contract-api';

import ConcurrentCounter from './concurrentCounter.js';
import describeContract, { withTimer } from './describeContract.js';

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

      zkApp.lastUpdatedOffchainState = undefined;

      const tx = await contractApi.transaction(zkApp, deployerAccount, () => {
        AccountUpdate.fundNewAccount(deployerAccount);
        zkApp.deploy();
      });

      await withTimer(
        'prove',
        async () => await contractApi.prove(zkApp, async () => await tx.prove())
      );

      // this tx needs .sign(), because `deploy()` adds an account update
      // that requires signature authorization
      await tx.sign([deployerKey, zkAppPrivateKey]).send();

      contractApi.restoreLatest(zkApp);

      return tx;
    }

    it('correctly updates the count state on the `ConcurrentCounter` smart contract', async () => {
      expect.assertions(2);

      // temporary manual testing
      const rootMap = new MerkleMap();
      const countersKeyInRoot = Key.fromString('counters').toField();
      const nestedMap = new MerkleMap();
      const keyInNestedMap = ConcurrentCounter.idToKey(
        UInt64.from(0)
      ).toField();
      nestedMap.set(keyInNestedMap, Poseidon.hash(UInt64.from(1).toFields()))
      rootMap.set(
        countersKeyInRoot,
        Poseidon.hash(nestedMap.getRoot().toFields())
      );

      const { senderAccount, senderKey, zkApp, contractApi } = context();

      const tx0 = await localDeploy();

      console.log(
        'ConcurrentCounter.deploy() successful, initial offchain state:',
        {
          offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
          data: zkApp.virtualStorage.data[zkApp.address.toBase58()],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          tx: tx0.toPretty(),
        }
      );

      console.log('ConcurrentCounter.increment(), dispatching an action...');

      const tx1 = await contractApi.transaction(zkApp, senderAccount, () => {
        zkApp.increment(UInt64.from(0), UInt64.from(1));
      });

      await withTimer(
        'prove',
        async () =>
          await contractApi.prove(zkApp, async () => await tx1.prove())
      );
      await tx1.sign([senderKey]).send();

      contractApi.restoreLatest(zkApp);

      console.log('ConcurrentCounter.rollup(), rolling up actions...', {
        counters:
          zkApp.counters.contract?.virtualStorage.data[
            zkApp.address.toBase58()
          ],
      });

      const tx2 = await contractApi.transaction(zkApp, senderAccount, () => {
        zkApp.rollup();
      });

      console.log('rollup tx', tx2.toPretty());

      await withTimer(
        'prove',
        async () =>
          await contractApi.prove(zkApp, async () => await tx2.prove())
      );
      await tx2.sign([senderKey]).send();

      contractApi.restoreLatest(zkApp);

      const [counter] = zkApp.counters.get<UInt64, UInt64>(
        UInt64,
        ConcurrentCounter.idToKey(UInt64.from(0))
      );

      console.log(
        'ConcurrentCounter.rollup() successful, new offchain state:',
        {
          counter: counter.toString(),
          offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
          data: zkApp.virtualStorage.data[zkApp.address.toBase58()],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          tx: tx2.toPretty(),
        }
      );

      expect(counter.toString()).toBe('1');
    });
  }
);
