/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/naming-convention */
import { isReady, Mina, PrivateKey, type PublicKey } from 'snarkyjs';
import { ContractApi, type OffchainStateContract } from '@zkfs/contract-api';
import { ZkfsNode } from '@zkfs/node';
import type { OrbitDbStorageLight } from '@zkfs/storage-orbit-db';

import TestNodeHelper from './helpers/testNodeHelper.js';
import createLightClientConfig from './helpers/lightClient.js';

interface ContractTestContext<ZkApp extends OffchainStateContract> {
  deployerAccount: PublicKey;
  deployerKey: PrivateKey;
  senderAccount: PublicKey;
  senderKey: PrivateKey;
  zkAppAddress: PublicKey;
  zkAppPrivateKey: PrivateKey;
  zkApp: ZkApp;
  contractApi: ContractApi;
  peerNode: TestNodeHelper;
  mockEventParser: (offchainState?: any) => Promise<void>;
}

const hasProofsEnabled = false;

async function withTimer<Result>(
  name: string,
  callback: () => Promise<Result>
): Promise<Result> {
  console.log(`Starting ${name}`);
  console.time(name);
  const result = await callback();
  console.timeEnd(name);
  return result;
}

function describeContract<ZkApp extends OffchainStateContract>(
  name: string,
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  Contract: typeof OffchainStateContract,
  testCallback: (context: () => ContractTestContext<ZkApp>) => void
) {
  let peerNode: TestNodeHelper, peerId: string;
  describe(name, () => {
    beforeAll(async () => {
      await isReady;
      console.time(name);
      // eslint-disable-next-line max-len
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, putout/putout
      if (hasProofsEnabled) {
        // eslint-disable-next-line @typescript-eslint/require-await
        const analyzedMethods = await withTimer('analyzeMethods', async () =>
          Contract.analyzeMethods()
        );

        console.log('analyzed methods', analyzedMethods);

        await withTimer('compile', async () => {
          await Contract.compile();
        });
      }
    });

    afterAll(() => {
      console.timeEnd(name);
    });

    // eslint-disable-next-line @typescript-eslint/init-declarations
    let context: ContractTestContext<ZkApp>;

    beforeEach(async () => {
      // eslint-disable-next-line new-cap
      const Local = Mina.LocalBlockchain({
        proofsEnabled: hasProofsEnabled,
        enforceTransactionLimits: false,
      });
      Mina.setActiveInstance(Local);

      // first test account is the deployer
      // eslint-disable-next-line putout/putout
      const [{ privateKey: deployerKey, publicKey: deployerAccount }] =
        Local.testAccounts;

      // second test account is the sender
      // eslint-disable-next-line putout/putout
      const [, { privateKey: senderKey, publicKey: senderAccount }] =
        Local.testAccounts;

      const zkAppPrivateKey = PrivateKey.random();
      const zkAppAddress = zkAppPrivateKey.toPublicKey();
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const zkApp = new Contract(zkAppAddress) as ZkApp;

      // eslint-disable-next-line max-len
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, putout/putout
      if (hasProofsEnabled) {
        // needs to be done because of Contract.compile()
        zkApp.resetLastUpdatedOffchainState();
      }

      const contractApi = new ContractApi();

      await peerNode.watchAddress(zkApp.address.toBase58());

      const lightClientConfig = await createLightClientConfig(peerId);
      const lightClient = new ZkfsNode<OrbitDbStorageLight>(lightClientConfig);
      await lightClient.start();
      console.log('light client was set up');
      const contractApi = new ContractApi(lightClient);

      async function mockEventParser(offchainState?: any) {
        const { virtualStorage } = contractApi;
        await peerNode.mockEventParser(
          zkApp.address.toBase58(),
          virtualStorage,
          offchainState
        );
      }
      console.log('mock event parser was set up');

      context = {
        deployerAccount,
        deployerKey,
        senderAccount,
        senderKey,
        zkApp,
        zkAppAddress,
        zkAppPrivateKey,
        contractApi,
        peerNode,
        mockEventParser,
      };
    }, 20_000);

    testCallback(() => context);
  });
}

export default describeContract;
export { withTimer };
