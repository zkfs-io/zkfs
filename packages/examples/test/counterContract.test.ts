/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import {
  Mina,
  isReady,
  type PublicKey,
  PrivateKey,
  UInt64,
  AccountUpdate,
  shutdown,
  type Field,
} from 'snarkyjs';
import { ContractApi, type OffchainStorageContract } from '@zkfs/contract-api';

import CounterContract, { CounterOffchainStorage } from './counterContract';

interface Sender {
  publicKey: PublicKey;
  privateKey: PrivateKey;
}

// eslint-disable-next-line max-params
async function deploy(
  sender: Sender,
  contract: OffchainStorageContract,
  contractKey: PrivateKey,
  offchainStateRootHash: Field | undefined
) {
  // deploy the contract
  const deployTx = await Mina.transaction({ sender: sender.publicKey }, () => {
    AccountUpdate.fundNewAccount(sender.publicKey);
    contract.deploy();
    if (!offchainStateRootHash) {
      throw new Error(
        'Unable to hydrate offchain state root hash with undefined'
      );
    }
    contract.hydrateOffchainStateRootHash(offchainStateRootHash);
  });

  await deployTx.prove();
  deployTx.sign([sender.privateKey, contractKey]);
  await deployTx.send();
}

describe('counterContract', () => {
  // eslint-disable-next-line @typescript-eslint/init-declarations
  let sender: Sender;

  beforeAll(async () => {
    await isReady;
    // eslint-disable-next-line new-cap
    const localInstance = Mina.LocalBlockchain({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      proofsEnabled: false,
    });
    [sender] = localInstance.testAccounts;
    Mina.setActiveInstance(localInstance);
  });

  afterAll(async () => {
    await shutdown();
  });

  describe('prerequisites', () => {
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('should compile', async () => {
      expect.assertions(0);

      await CounterContract.compile();
    });
  });

  describe('demo', () => {
    it('should showcase how offchain storage is used', async () => {
      expect.assertions(1);

      // contract necessities
      const contractKey = PrivateKey.random();
      const contract = new CounterContract(contractKey.toPublicKey());

      // initialize the offchain storage contract api
      const contractApi = new ContractApi();
      const storage = new CounterOffchainStorage({
        value: UInt64.from(0),
      });

      // hydrate the initial virtual storage
      // virtual storage = snapshot of the offchain storage
      // used during method execution
      contractApi.virtualStorage.set(
        contractKey.toPublicKey(),
        contract.counter.key,
        CounterOffchainStorage.toFields(storage)
      );

      // after hydrating the offchain state, get the merkle map root
      const offchainStateRootHash = contractApi.virtualStorage.getRoot(
        contractKey.toPublicKey()
      );

      // deploy the smart contract with the initial offchain state root hash
      await deploy(sender, contract, contractKey, offchainStateRootHash);

      // execute a transaction wrapped with the offchain storage contract api
      // this allows us to prefetch offchain state,
      // and save updates to the offchain state
      const tx = await contractApi.transaction(
        contract,
        { sender: sender.publicKey },
        () => {
          contract.increment();
        }
      );

      await tx.prove();
      tx.sign([sender.privateKey, contractKey]);
      await tx.send();

      // check if the offchain state was modified
      // in the required way
      const { value: newCounter } = contract.counter.get();

      expect(newCounter.value.toString()).toBe('1');
    });
  });
});
