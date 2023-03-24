/* eslint-disable jest/consistent-test-it */
/* eslint-disable no-console */
/* eslint-disable jest/require-top-level-describe */
/* eslint-disable max-statements */

import OffchainStateBackup from '@zkfs/contract-api/dist/offchainStateBackup.js';
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
      OffchainStateBackup.restoreLatest(zkApp);
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
          data: zkApp.virtualStorage.data[zkApp.address.toBase58()],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          tx: tx0.toPretty(),
        }
      );

      console.log('ConcurrentCounter.increment(), dispatching an action...');

      const tx1 = await contractApi.transaction(zkApp, senderAccount, () => {
        zkApp.increment(UInt64.from(0), UInt64.from(1));
      });

      await tx1.prove();
      await tx1.sign([senderKey]).send();

      OffchainStateBackup.restoreLatest(zkApp);

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

      await tx2.prove();
      await tx2.sign([senderKey]).send();
      OffchainStateBackup.restoreLatest(zkApp);

      console.log(
        'ConcurrentCounter.rollup() successful, new offchain state:',
        {
          offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
          data: zkApp.virtualStorage.data[zkApp.address.toBase58()],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          tx: tx2.toPretty(),
        }
      );

      ConcurrentCounter.analyzeMethods();

      // we fetch the counter manually, because invoking .getCounter
      // throws an error:
      //  "Can't evaluate prover code outside an as_prover block"
      // https://discord.com/channels/484437221055922177/1085194876683046992
      const key =
        '23402912503577835451439776101235707424342461142742967038229275985488249192799-21565680844461314807147611702860246336805372493508489110556896454939225549736';
      const data = zkApp.virtualStorage.data[zkApp.address.toBase58()];
      const counter = data?.[key]?.[0];

      expect(counter).toBe('1');
    });
  }
);
