/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable unicorn/prevent-abbreviations */
import { TextEncoder, TextDecoder } from 'node:util';

import { v4 as uuidv4 } from 'uuid';
import type { Message } from '@libp2p/interface-pubsub';

import {
  type RequestSchemaType,
  type ResponseSchemaType,
  requestTopic,
  responseSchema,
  validatorFactory,
  responseTopicPrefix,
  // eslint-disable-next-line import/no-relative-packages
} from '../../../services/orbit-db-data-pubsub/src/schemas.js';

import type { OrbitDbStorageLightConfig, Address } from './interface.js';
import OrbitDbStoragePartial from './orbitDbStoragePartial.js';

const responseValidation = validatorFactory<ResponseSchemaType>(responseSchema);

class OrbitDbStorageLight extends OrbitDbStoragePartial {
  public lightClientConfig: OrbitDbStorageLightConfig;

  public override databasePrefix = 'lightClient.';

  public constructor(config: OrbitDbStorageLightConfig) {
    super({ ...config, addresses: [] });
    this.lightClientConfig = config;
  }

  public createGetMapRequest(id: string, account: Address, key: string) {
    const requestBody: RequestSchemaType = {
      id,
      type: 'getMap',
      payload: { key, account },
    };
    return new TextEncoder().encode(JSON.stringify(requestBody));
  }

  public override async getMap(account: Address): Promise<string> {
    // eslint-disable-next-line promise/avoid-new, no-async-promise-executor
    return await new Promise<string>(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // eslint-disable-next-line prefer-promise-reject-errors
        reject(undefined);
      }, this.lightClientConfig.pubsub.timeout);

      // subscribe to response
      const onResponseHandler = async (msg: Message) => {
        clearTimeout(timeoutId);
        try {
          const serializedMapResponse = new TextDecoder().decode(msg.data);
          const { data } = responseValidation.verify(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            JSON.parse(serializedMapResponse)
          ).payload;

          const mapFromStore = await this.getMapLightClient(account, data);
          resolve(mapFromStore);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.log(
            'Error decoding orbit-db data provider request\n',
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            (error as Error).message
          );
        }
      };
      try {
        const id = uuidv4();
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await this.config.ipfs.pubsub.subscribe(
          responseTopicPrefix + id,
          onResponseHandler
        );

        // publish request
        const request = this.createGetMapRequest(id, account, 'root');
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await this.config.ipfs.pubsub.publish(requestTopic, request);
      } catch (error) {
        reject(error);
      }
    });
  }

  public async getMapLightClient(account: Address, map: string) {
    await this.createStoreInstanceIfNotExisting(account);

    // set and retrieve from db store
    await this.setMap(account, map);

    const mapStore = this.storeInstances[this.getZkfsMapPath(account)];
    return mapStore.get('root');
  }

  public async createStoreInstanceIfNotExisting(account: Address) {
    if (
      !this.storeInstances ||
      !this.storeInstances[this.getZkfsMapPath(account)]
    ) {
      const keyValueStore = await this.createGetMapDbStore(account);
      this.saveStoreInstances([
        { [this.getZkfsMapPath(account)]: keyValueStore },
      ]);
    }
  }

  public async createGetMapDbStore(account: Address) {
    const dbAddress = await this.getMapOrbitDbAddress(account);
    return await this.orbitDb.keyvalue<string>(dbAddress.toString());
  }
}

export default OrbitDbStorageLight;
