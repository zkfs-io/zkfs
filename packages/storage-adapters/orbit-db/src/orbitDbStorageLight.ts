/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable unicorn/prevent-abbreviations */
import { TextEncoder, TextDecoder } from 'node:util';

import { v4 as uuidv4 } from 'uuid';
import type { Message } from '@libp2p/interface-pubsub';
import { getMapSchemaType } from '../../../services/orbit-db-data-pubsub/src/schemas.js';

import type { OrbitDbStorageLightConfig } from './interface.js';
import OrbitDbStoragePartial from './orbitDbStoragePartial.js';

class OrbitDbStorageLight extends OrbitDbStoragePartial {
  public lightClientConfig: OrbitDbStorageLightConfig;

  public override databasePrefix = 'lightClient.';

  public constructor(config: OrbitDbStorageLightConfig) {
    super({ ...config, addresses: [] });
    this.lightClientConfig = config;
  }

  public createGetMapRequest(id: string, account: string) {
    const requestBody: getMapSchemaType = {
      id,
      type: 'getMap',
      payload: { map: 'root', account },
    };
    return new TextEncoder().encode(JSON.stringify(requestBody));
  }

  public override async getMap(account: string): Promise<string> {
    // eslint-disable-next-line promise/avoid-new, no-async-promise-executor
    return await new Promise<string>(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // eslint-disable-next-line prefer-promise-reject-errors
        reject(undefined);
      }, this.lightClientConfig.pubsub.timeout);

      // subscribe to response
      const onResponseHandler = async (msg: Message) => {
        clearTimeout(timeoutId);
        const map = await this.getMapResponseHandler(account, msg);
        resolve(map);
      };
      try {
        const id = uuidv4();
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await this.config.ipfs.pubsub.subscribe(
          `response-${id}`,
          onResponseHandler
        );

        // publish request
        const request = this.createGetMapRequest(id, account);
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await this.config.ipfs.pubsub.publish(`zkfs:request`, request);
      } catch (error) {
        reject(error);
      }
    });
  }

  public async getMapResponseHandler(account: string, msg: Message) {
    const keyValueStore = await this.createGetMapDbStore(account);
    const serializedMapResponse = new TextDecoder().decode(msg.data);

    // set and retrieve from db store
    await keyValueStore.set('root', serializedMapResponse);
    const map = keyValueStore.get('root');

    // save db store instance
    this.storeInstances = {
      ...this.storeInstances,
      [this.getZkfsMapPath(account)]: keyValueStore,
    };
    return map;
  }

  public async createGetMapDbStore(account: string) {
    const dbAddress = await this.getMapOrbitDbAddress(account);
    return await this.orbitDb.keyvalue<string>(dbAddress.toString());
  }
}

export default OrbitDbStorageLight;
