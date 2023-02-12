/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/init-declarations */
/* eslint-disable one-var */
/* eslint-disable putout/putout */
import {
  isReady,
  Mina,
  PrivateKey,
  type PublicKey,
  AccountUpdate,
  UInt64,
} from 'snarkyjs';
import { ContractApi } from '@zkfs/contract-api';

import Counter from './counter.js';

const hasProofsEnabled = false;

describe('counter', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Counter,
    contractApi: ContractApi;

  beforeAll(async () => {
    await isReady;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (hasProofsEnabled) {
      await Counter.compile();
    }
  });

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/naming-convention, new-cap
    const Local = Mina.LocalBlockchain({ proofsEnabled: hasProofsEnabled });
    Mina.setActiveInstance(Local);

    // first test account is the deployer
    [{ privateKey: deployerKey, publicKey: deployerAccount }] =
      Local.testAccounts;

    // second test account is the sender
    [, { privateKey: senderKey, publicKey: senderAccount }] =
      Local.testAccounts;
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Counter(zkAppAddress);
    contractApi = new ContractApi();
  });

  async function localDeploy() {
    const tx = await contractApi.transaction(zkApp, deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await tx.prove();

    // this tx needs .sign(), because `deploy()` adds an account update
    // that requires signature authorization
    await tx.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('correctly updates the count state on the `Counter` smart contract', async () => {
    expect.assertions(1);

    await localDeploy();

    console.log('Counter.deploy() successful, initial offchain state:', {
      count: zkApp.count.get().value.toString(),
      offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
    });

    console.log('Counter.update(), updating the offchain state...');

    // update transaction
    const tx = await contractApi.transaction(zkApp, senderAccount, () => {
      zkApp.update();
    });

    await tx.prove();
    await tx.sign([senderKey]).send();

    const { value: updatedCount } = zkApp.count.get();

    expect(updatedCount.toString()).toStrictEqual(UInt64.from(1).toString());

    console.log('Counter.update() successful, new offchain state:', {
      count: updatedCount.toString(),
      offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
    });
  });
});
