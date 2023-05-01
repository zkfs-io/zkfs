/* eslint-disable unicorn/prevent-abbreviations */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { TextEncoder } from 'node:util';

import {
  type RequestSchemaType,
  type ResponseSchemaType,
  responseTopicPrefix,
} from '../schemas.js';
// eslint-disable-next-line import/no-relative-packages
import type OrbitDbStoragePartial from '../../../../storage-adapters/orbit-db/src/orbitDbStoragePartial.js';
// eslint-disable-next-line import/no-relative-packages
import type { ZkfsNode } from '../../../../node/src/interface.js';

/**
 * It takes a request, gets the data from the storage, and
 * publishes the response
 *
 * @param zkfsNode - ZkfsNode<OrbitDbStoragePartial>
 * @param {RequestSchemaType} request - RequestSchemaType
 */
async function handleGetMapRequest(
  zkfsNode: ZkfsNode<OrbitDbStoragePartial>,
  request: RequestSchemaType
) {
  const { account, key: mapName } = request.payload;

  // eslint-disable-next-line etc/no-deprecated
  const data = await zkfsNode.storage.getMap(account, mapName);

  const response: ResponseSchemaType = {
    // eslint-disable-next-line unicorn/no-null
    payload: { data: data ?? null },
  };

  const message = JSON.stringify(response);
  const encodedMessage = new TextEncoder().encode(message);

  const topic = responseTopicPrefix + request.id;
  // eslint-disable-next-line max-len
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  await zkfsNode.storage.config.ipfs.pubsub.publish(topic, encodedMessage);
}

export default handleGetMapRequest;
