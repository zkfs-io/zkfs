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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    JSON.parse(keys)
  );
  // eslint-disable-next-line unicorn/no-null
  const data = valueRecords ? JSON.stringify(valueRecords) : null;

  const response: ResponseSchemaType = {
    payload: { data },
  };

  const message = JSON.stringify(response);
  const encodedMessage = new TextEncoder().encode(message);

  const topic = responseTopicPrefix + request.id;
  // eslint-disable-next-line max-len
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  await zkfsNode.storage.config.ipfs.pubsub.publish(topic, encodedMessage);
}

export default handleGetWitnessRequest;
