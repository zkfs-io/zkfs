/* eslint-disable unicorn/prevent-abbreviations */
import { TextEncoder, TextDecoder } from 'node:util';

import type { OrbitDbStoragePartial } from '@zkfs/storage-orbit-db';
import type { Message } from '@libp2p/interface-pubsub';

import type { Service, ZkfsNode } from '../../../node/src/interface.js';
import { validatorFactory, getMapSchema } from './schemas.js';
import type { getMapSchemaType } from './schemas.js';

const getMapRequestValidation =
  validatorFactory<getMapSchemaType>(getMapSchema);

class OrbitDbDataPubSub implements Service {
  public async initialize(
    zkfsNode: ZkfsNode<OrbitDbStoragePartial>
  ): Promise<void> {
    zkfsNode.storage.config.ipfs.pubsub.subscribe(
      `zkfs:request`,
      async (msg: { data: NodeJS.ArrayBufferView | ArrayBuffer | null | undefined; }) => {
        const decodedString = new TextDecoder().decode(msg.data);
        const request = getMapRequestValidation.verify(
          JSON.parse(decodedString)
        );
        if (request.type === 'getMap' && request.payload.map === 'root') {
          try {
            const map = await zkfsNode.storage.getMap(request.payload.account);
            if (map) {
              await zkfsNode.storage.config.ipfs.pubsub.publish(
                `response-${request.id}`,
                new TextEncoder().encode(map)
              );
            }
          } catch (error) {
            console.error(error);
          }
        }
      }
    );
  }
}

export default OrbitDbDataPubSub;
