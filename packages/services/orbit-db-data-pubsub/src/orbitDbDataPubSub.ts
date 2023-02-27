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
  public async initialize(
    zkfsNode: ZkfsNode<OrbitDbStoragePartial>
  ): Promise<void> {
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await zkfsNode.storage.config.ipfs.pubsub.subscribe(
      requestTopic,
      async (msg: Message) => {
        const decodedString = new TextDecoder().decode(msg.data);
        try {
          const request = getMapRequestValidation.verify(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            JSON.parse(decodedString)
          );
          if (request.type === 'getMap' && request.payload.key === 'root') {
            await this.handleGetMapRequest(zkfsNode, request);
          }
          if (request.type === 'getValues') {
            await this.handleGetValuesRequest(zkfsNode, request);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.log(
            'Error handling getMap for orbit-db data provider request\n',
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            (error as Error).message
          );
        }
      }
    );
  }

  public async handleGetMapRequest(
    zkfsNode: ZkfsNode<OrbitDbStoragePartial>,
    request: {
      id: string;
      type: string;
      payload: { key: string; account: string };
    }
  ) {
    const data = await zkfsNode.storage.getMap(request.payload.account);

    const response: ResponseSchemaType = {
      payload: { data },
    };
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await zkfsNode.storage.config.ipfs.pubsub.publish(
      responseTopicPrefix + request.id,
      new TextEncoder().encode(JSON.stringify(response))
    );
  }

  public async handleGetValuesRequest(
    zkfsNode: ZkfsNode<OrbitDbStoragePartial>,
    request: {
      id: string;
      type: string;
      payload: { key: string; account: string };
    }
  ) {
    const data = await zkfsNode.storage.getValues(
      request.payload.account,
      JSON.parse(request.payload.key)
    );

    const response: ResponseSchemaType = {
      payload: { data: JSON.stringify(data) },
    };
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await zkfsNode.storage.config.ipfs.pubsub.publish(
      responseTopicPrefix + request.id,
      new TextEncoder().encode(JSON.stringify(response))
    );
  }
}

export default OrbitDbDataPubSub;
