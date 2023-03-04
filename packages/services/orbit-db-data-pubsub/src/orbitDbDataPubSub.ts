/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable unicorn/prevent-abbreviations */
import { TextEncoder, TextDecoder } from 'node:util';

import type { Message } from '@libp2p/interface-pubsub';

// eslint-disable-next-line import/no-relative-packages
import type OrbitDbStoragePartial from '../../../storage-adapters/orbit-db/src/orbitDbStoragePartial.js';
// eslint-disable-next-line import/no-relative-packages
import type { Service, ZkfsNode } from '../../../node/src/interface.js';

import {
  validatorFactory,
  requestSchema,
  requestTopic,
  type RequestSchemaType,
  type ResponseSchemaType,
  responseTopicPrefix,
} from './schemas.js';

const getMapRequestValidation =
  validatorFactory<RequestSchemaType>(requestSchema);

class OrbitDbDataPubSub implements Service {
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
        if (request.type === 'getMap' && request.payload.key === 'root') {
          await this.handleGetMapRequest(zkfsNode, request);
        }
        if (request.type === 'getValues') {
          await this.handleGetValuesRequest(zkfsNode, request);
        }
      } catch (error) {
        console.error(
          'Error handling orbit-db data provider request:',
          (error as Error).message
        );
      }
    };

    const pubsub = zkfsNode.storage.config.ipfs.pubsub;
    await pubsub.subscribe(requestTopic, handleRequest);
  }

  /**
   * It takes a request, gets the data from the storage, and publishes the response
   *
   * @param zkfsNode - ZkfsNode<OrbitDbStoragePartial>
   * @param {RequestSchemaType} request - RequestSchemaType
   */
  public async handleGetMapRequest(
    zkfsNode: ZkfsNode<OrbitDbStoragePartial>,
    request: RequestSchemaType
  ) {
    const { account, key: mapName } = request.payload;

    const data = await zkfsNode.storage.getMap(account, mapName);

    const response: ResponseSchemaType = {
      payload: { data: data ?? null },
    };
    console.log('handling get map request', data ? 'much data' : 'undefined');

    const message = JSON.stringify(response);
    const encodedMessage = new TextEncoder().encode(message);

    const topic = responseTopicPrefix + request.id;
    await zkfsNode.storage.config.ipfs.pubsub.publish(topic, encodedMessage);
  }

  /**
   * It takes a request, gets the data from the storage, and publishes the response
   *
   * @param zkfsNode - ZkfsNode<OrbitDbStoragePartial>
   * @param {RequestSchemaType} request - RequestSchemaType
   */
  public async handleGetValuesRequest(
    zkfsNode: ZkfsNode<OrbitDbStoragePartial>,
    request: RequestSchemaType
  ) {
    const { account, key: keys } = request.payload;
    console.log('get value request', request.payload);
    const valueRecords = await zkfsNode.storage.getValues(
      account,
      JSON.parse(keys)
    );
    const data = valueRecords ? JSON.stringify(valueRecords) : null;

    console.log('handling get values response', data ?? 'undefined');

    const response: ResponseSchemaType = {
      payload: { data },
    };

    const message = JSON.stringify(response);
    const encodedMessage = new TextEncoder().encode(message);

    const topic = responseTopicPrefix + request.id;
    await zkfsNode.storage.config.ipfs.pubsub.publish(topic, encodedMessage);
  }
}

export default OrbitDbDataPubSub;
