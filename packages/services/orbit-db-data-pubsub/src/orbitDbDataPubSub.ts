/* eslint-disable func-style */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable unicorn/prevent-abbreviations */
import { TextEncoder, TextDecoder } from 'node:util';

import type { Message } from '@libp2p/interface-pubsub';

// eslint-disable-next-line import/no-relative-packages
import type OrbitDbStoragePartial from '../../../storage-adapters/orbit-db/src/orbitDbStoragePartial.js';
// eslint-disable-next-line import/no-relative-packages
import type { Service, StorageAdapter, ZkfsNode } from '../../../node/src/interface.js';
import handleGetMapRequest from './handlers/getMapRequest.js';
import handleGetValuesRequest from './handlers/getValuesRequest.js'
import handleGetWitnessRequest from './handlers/getWitnessRequest.js'
import {
  validatorFactory,
  requestSchema,
  requestTopic,
  type RequestSchemaType,
} from './schemas.js';

const getMapRequestValidation =
  validatorFactory<RequestSchemaType>(requestSchema);

class OrbitDbDataPubSub implements Service<StorageAdapter> {
  /**
   * It subscribes to the request and handles incoming requests
   *
   * @param zkfsNode - ZkfsNode<OrbitDbStoragePartial>
   */
  // TODO: make services generic
  // @ts-expect-error
  public async initialize(
    zkfsNode: ZkfsNode<OrbitDbStoragePartial>
  ): Promise<void> {
    const handleRequest = async (msg: Message) => {
      const decodedString = new TextDecoder().decode(msg.data);
      try {
        const request = getMapRequestValidation.verify(
          JSON.parse(decodedString)
        );
        if (request.type === 'getMap') {
          await handleGetMapRequest(zkfsNode, request);
        }
        if (request.type === 'getValues') {
          await handleGetValuesRequest(zkfsNode, request);
        }
        if (request.type === 'getWitness') {
          await handleGetWitnessRequest(zkfsNode, request);
        }
      } catch (error) {
        console.error(
          'Error handling orbit-db data provider request:',
          // eslint-disable-next-line max-len
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          (error as Error).message
        );
      }
    };
    console.log('initializing data provider');
    const pubsub = zkfsNode.storage.config.ipfs.pubsub;
    await pubsub.subscribe(requestTopic, handleRequest);
  }

}

export default OrbitDbDataPubSub;
