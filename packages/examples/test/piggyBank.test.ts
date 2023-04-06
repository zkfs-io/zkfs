/* eslint-disable max-statements */
/* eslint-disable jest/consistent-test-it */
/* eslint-disable no-console */
/* eslint-disable jest/require-top-level-describe */

import { AccountUpdate, MerkleMap, Poseidon, UInt64 } from 'snarkyjs';

import PiggyBank from './piggyBank.js';
import describeContract, { withTimer } from './describeContract.js';
import { Key } from '@zkfs/contract-api';

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

    await withTimer('prove', async () => {
      await tx.prove();
    });

    // this tx needs .sign(), because `deploy()` adds an account update
    // that requires signature authorization
    await tx.sign([deployerKey, zkAppPrivateKey]).send();

    PiggyBank.offchainState.backup.restoreLatest(zkApp);

    return tx;
  }

  it('correctly deposits an amount for a user to the `PiggyBank` smart contract', async () => {
    expect.assertions(3);

    Error.stackTraceLimit = 1000;

    const { senderAccount, senderKey, zkApp, contractApi } = context();

    const rootMap = new MerkleMap();

    const depositKeyInRoot = Key.fromString('deposits');

    const depositsMap = new MerkleMap();
    const keySender = zkApp.getDepositKey(senderAccount);
    depositsMap.set(
      keySender.toField(),
      Poseidon.hash(UInt64.from(20).toFields())
    );

    rootMap.set(
      depositKeyInRoot.toField(),
      Poseidon.hash(depositsMap.getRoot().toFields())
    );

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

    await withTimer('prove', async () => await tx1.prove());
    await tx1.sign([senderKey]).send();

    PiggyBank.offchainState.backup.restoreLatest(zkApp);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const key = `${zkApp.deposits.mapName!.toString()}-${zkApp
      .getDepositKey(senderAccount)
      .toString()}`;

    const currentDepositAmount =
      zkApp.virtualStorage.data[zkApp.address.toBase58()]?.[key]?.[0];

    console.log('PiggyBank.initialDeposit() successful, new offchain state:', {
      currentDepositAmount,
      offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
      data: zkApp.virtualStorage.data[zkApp.address.toBase58()],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      tx: tx1.toPretty(),
    });

    expect(currentDepositAmount).toStrictEqual(UInt64.from(10).toString());

    console.log('PiggyBank.deposit(), updating the offchain state...');

    // update transaction
    const tx2 = await withTimer(
      'transaction',
      async () =>
        await contractApi.transaction(zkApp, senderAccount, () => {
          zkApp.deposit(senderAccount, UInt64.from(10));
        })
    );

    await withTimer('prove', async () => await tx2.prove());
    await tx2.sign([senderKey]).send();

    PiggyBank.offchainState.backup.restoreLatest(zkApp);

    const currentUpdatedDepositAmount =
      zkApp.virtualStorage.data[zkApp.address.toBase58()]?.[key]?.[0];

    expect(currentUpdatedDepositAmount).toStrictEqual(
      UInt64.from(20).toString()
    );

    console.log('PiggyBank.deposit() successful, new offchain state:', {
      currentUpdatedDepositAmount,
      offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
      data: zkApp.virtualStorage.data[zkApp.address.toBase58()],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      tx: tx2.toPretty(),
    });

    expect(zkApp.offchainStateRootHash.get().toString()).toBe(rootMap.getRoot().toString())
  });
});
