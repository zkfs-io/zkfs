/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable unicorn/prevent-abbreviations */
import { TextEncoder, TextDecoder } from 'node:util';

import type { Message } from '@libp2p/interface-pubsub';
import type OrbitDbStoragePartial from '../../../storage-adapters/orbit-db/src/orbitDbStoragePartial.js';

// eslint-disable-next-line import/no-relative-packages
import type { Service, ZkfsNode } from '../../../node/src/interface.js';

import {
  validatorFactory,
  getMapSchema,
  requestTopic,
  type getMapSchemaType,
} from './schemas.js';

const getMapRequestValidation =
  validatorFactory<getMapSchemaType>(getMapSchema);

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
          if (request.type === 'getMap' && request.payload.map === 'root') {
            const map = await zkfsNode.storage.getMap(request.payload.account);
            if (map) {
              await zkfsNode.storage.config.ipfs.pubsub.publish(
                `response-${request.id}`,
                new TextEncoder().encode(map)
              );
            }
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.log(
            'Error decoding orbit-db data provider request\n',
            (error as Error).message
          );
        }
      }
    );
  }
}

export default OrbitDbDataPubSub;
