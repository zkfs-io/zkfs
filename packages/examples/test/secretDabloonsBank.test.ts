/* eslint-disable jest/consistent-test-it */
/* eslint-disable no-console */
/* eslint-disable jest/require-top-level-describe */

import { AccountUpdate, UInt64 } from 'snarkyjs';

import SecretDabloonsBank from './secretDabloonsBank.js';
import describeContract from './describeContract.js';

// eslint-disable-next-line jest/require-hook
describeContract<SecretDabloonsBank>(
  'secretDabloonsBank',
  SecretDabloonsBank,
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

    it('correctly updates the count state on the `SecretDabloonsBank` smart contract', async () => {
      expect.assertions(0);

      const { senderAccount, senderKey, zkApp, contractApi, zkAppPrivateKey } =
        context();

      const tx0 = await localDeploy();

      console.log('after init data', {
        data: zkApp.virtualStorage?.data[zkApp.address.toBase58()],
      });

      console.log(
        'SecretDabloonsBank.deploy() successful, initial offchain state:',
        {
          offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
          data: zkApp.virtualStorage?.data[zkApp.address.toBase58()],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          tx: tx0.toPretty(),
        }
      );

      console.log(
        'SecretDabloonsBank.deposit(), updating the offchain state...'
      );

      // update transaction
      const tx1 = await contractApi.transaction(zkApp, senderAccount, () => {
        zkApp.deposit(UInt64.from(1), zkAppPrivateKey);
      });

      await tx1.prove();
      await tx1.sign([senderKey]).send();

      console.log(
        'SecretDabloonsBank.deposit() successful, new offchain state:',
        {
          offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
          data: zkApp.virtualStorage?.data[zkApp.address.toBase58()],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          tx: tx1.toPretty(),
        }
      );

      console.log(
        'SecretDabloonsBank.deposit() the second time, updating the offchain state...'
      );

      // update transaction
      const tx2 = await contractApi.transaction(zkApp, senderAccount, () => {
        zkApp.deposit(UInt64.from(1), zkAppPrivateKey);
      });

      await tx2.prove();
      await tx2.sign([senderKey]).send();

      console.log(
        'SecretDabloonsBank.update() successful, new offchain state:',
        {
          offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
          data: zkApp.virtualStorage?.data[zkApp.address.toBase58()],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          tx: tx2.toPretty(),
        }
      );
    });
  }
);
