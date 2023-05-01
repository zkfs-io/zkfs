/* eslint-disable unicorn/prevent-abbreviations */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { TextEncoder } from 'node:util';

import {
  type RequestSchemaType,
  type ResponseSchemaType,
  responseTopicPrefix,
  type WitnessResponseData,
} from '../schemas.js';
// eslint-disable-next-line import/no-relative-packages
import type OrbitDbStoragePartial from '../../../../storage-adapters/orbit-db/src/orbitDbStoragePartial.js';
// eslint-disable-next-line import/no-relative-packages
import type { ZkfsNode } from '../../../../node/src/interface.js';

// eslint-disable-next-line max-params
function createDataObject(
  storage: OrbitDbStoragePartial,
  account: string,
  mapName: string,
  key: string
): WitnessResponseData {
  const map = storage.virtualStorage.getMap(account, mapName);
  const root = map.getRoot().toString();
  const value = storage.virtualStorage.getSerializedValue(
    account,
    mapName,
    key
  );
  const witness = storage.virtualStorage.getSerializedWitness(
    account,
    mapName,
    key
  );

  return {
    metadata: {
      root,
      value: value ?? [],
    },

    witness,
  };
}

function createResponse(data: WitnessResponseData): ResponseSchemaType {
  const serializedData = JSON.stringify(data);

  return {
    payload: { data: serializedData },
  };
}

function encodeMessage(response: ResponseSchemaType): Uint8Array {
  const message = JSON.stringify(response);
  return new TextEncoder().encode(message);
}

async function handleGetWitnessRequest(
  zkfsNode: ZkfsNode<OrbitDbStoragePartial>,
  request: RequestSchemaType
) {
  const { account, key: combinedKey } = request.payload;
  const [mapName, key] = combinedKey.split('-');
  const { storage } = zkfsNode;

  const data = createDataObject(storage, account, mapName, key);
  const response = createResponse(data);
  const encodedMessage = encodeMessage(response);

  const topic = responseTopicPrefix + request.id;
  // eslint-disable-next-line max-len
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, unicorn/consistent-destructuring
  await zkfsNode.storage.config.ipfs.pubsub.publish(topic, encodedMessage);
}

export default handleGetWitnessRequest;
