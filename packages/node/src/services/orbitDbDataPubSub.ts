/* eslint-disable unicorn/prevent-abbreviations */
import { TextEncoder, TextDecoder } from 'node:util';

import type { OrbitDbStoragePartial } from '@zkfs/storage-orbit-db';

import type { Service, ZkfsNode } from '../interface.js';

class OrbitDbDataPubSub implements Service {
  public async initialize(
    zkfsNode: ZkfsNode<OrbitDbStoragePartial>
  ): Promise<void> {
    zkfsNode.storage.config.ipfs.pubsub.subscribe(
      `zkfs:request`,
      async (msg) => {
        const request = JSON.parse(new TextDecoder().decode(msg.data));

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
