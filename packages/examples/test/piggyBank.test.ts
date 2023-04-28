/* eslint-disable max-statements */
/* eslint-disable jest/consistent-test-it */
/* eslint-disable no-console */
/* eslint-disable jest/require-top-level-describe */

import { AccountUpdate, type PublicKey, UInt64 } from 'snarkyjs';
import { Key } from '@zkfs/contract-api';

import PiggyBank from './piggyBank.js';
import describeContract, { withTimer } from './describeContract.js';

// eslint-disable-next-line jest/require-hook
describeContract<PiggyBank>('piggyBank', PiggyBank, (context) => {
  async function localDeploy() {
    const {
      deployerAccount,
      deployerKey,
      zkAppPrivateKey,
      zkApp,
      contractApi,
    } = context();

    const tx = await withTimer(
      'transaction',
      async () =>
        await contractApi.transaction(zkApp, deployerAccount, () => {
          AccountUpdate.fundNewAccount(deployerAccount);
          zkApp.deploy();
        })
    );

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

  it.only('correctly deposits an amount for a user to the `PiggyBank` smart contract', async () => {
    expect.assertions(2);

    Error.stackTraceLimit = 1000;

    const { senderAccount, senderKey, zkApp, contractApi } = context();

    const tx0 = await localDeploy();

    console.log('PiggyBank.deploy() successful, initial offchain state:', {
      offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
      data: zkApp.virtualStorage.data[zkApp.address.toBase58()],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      tx: tx0.toPretty(),
    });

    console.log('PiggyBank.initialDeposit(), updating the offchain state...');

    // update transaction
    const tx1 = await withTimer(
      'transaction',
      async () =>
        await contractApi.transaction(zkApp, senderAccount, () => {
          zkApp.initialDeposit(senderAccount, UInt64.from(10));
        })
    );

    await withTimer(
      'prove',
      async () => await contractApi.prove(zkApp, async () => await tx1.prove())
    );
    await tx1.sign([senderKey]).send();

    contractApi.restoreLatest(zkApp);

    const [currentDepositAmount] = zkApp.deposits.get<PublicKey, UInt64>(
      UInt64,
      zkApp.getDepositKey(senderAccount)
    );

    console.log('PiggyBank.initialDeposit() successful, new offchain state:', {
      currentDepositAmount: currentDepositAmount.toString(),
      offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
      data: zkApp.virtualStorage.data[zkApp.address.toBase58()],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      tx: tx1.toPretty(),
    });

    expect(currentDepositAmount.toString()).toStrictEqual(
      UInt64.from(10).toString()
    );

    console.log('PiggyBank.deposit(), updating the offchain state...');

    // update transaction
    const tx2 = await withTimer(
      'transaction',
      async () =>
        await contractApi.transaction(zkApp, senderAccount, () => {
          zkApp.deposit(senderAccount, UInt64.from(10));
        })
    );

    await withTimer(
      'prove',
      async () => await contractApi.prove(zkApp, async () => await tx2.prove())
    );
    await tx2.sign([senderKey]).send();

    contractApi.restoreLatest(zkApp);

    const [currentUpdatedDepositAmount] = zkApp.deposits.get<PublicKey, UInt64>(
      UInt64,
      zkApp.getDepositKey(senderAccount)
    );

    expect(currentUpdatedDepositAmount.toString()).toStrictEqual(
      UInt64.from(20).toString()
    );

    console.log('PiggyBank.deposit() successful, new offchain state:', {
      currentUpdatedDepositAmount: currentUpdatedDepositAmount.toString(),
      offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
      data: zkApp.virtualStorage.data[zkApp.address.toBase58()],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      tx: tx2.toPretty(),
    });
  }, 40_000);
});
