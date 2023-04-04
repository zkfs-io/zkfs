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

async function handleGetWitnessRequest(
  zkfsNode: ZkfsNode<OrbitDbStoragePartial>,
  request: RequestSchemaType
) {
  const { account, key: keys } = request.payload;

  const valueRecords = await zkfsNode.storage.getValues(
    account,
    JSON.parse(keys)
  );
  const data = valueRecords ? JSON.stringify(valueRecords) : null;

  const response: ResponseSchemaType = {
    payload: { data },
  };

  const message = JSON.stringify(response);
  const encodedMessage = new TextEncoder().encode(message);

  const topic = responseTopicPrefix + request.id;
  await zkfsNode.storage.config.ipfs.pubsub.publish(topic, encodedMessage);
}

export default handleGetWitnessRequest;
