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

import type {
  OrbitDbStorageLightConfig,
  Address,
  ValueRecord,
} from './interface.js';
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

  public createGetValuesRequest(id: string, account: Address, keys: string[]) {
    const requestBody: RequestSchemaType = {
      id,
      type: 'getValues',
      payload: { key: JSON.stringify(keys), account },
    };
    return new TextEncoder().encode(JSON.stringify(requestBody));
  }

  public getDataFromPubSubMessage(msg: Message) {
    const decodedResponseMessage = new TextDecoder().decode(msg.data);
    const { data } = responseValidation.verify(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      JSON.parse(decodedResponseMessage)
    ).payload;
    return data;
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
          const data = this.getDataFromPubSubMessage(msg);
          const map = await this.validateMapInLightClient(account, data);
          resolve(map);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(
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

  public override async getValues(
    account: Address,
    keys: string[]
  ): Promise<ValueRecord> {
    // eslint-disable-next-line promise/avoid-new, no-async-promise-executor
    return await new Promise<ValueRecord>(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // eslint-disable-next-line prefer-promise-reject-errors
        reject(undefined);
      }, this.lightClientConfig.pubsub.timeout);

      // subscribe to response
      const onResponseHandler = async (msg: Message) => {
        clearTimeout(timeoutId);
        try {
          const data = this.getDataFromPubSubMessage(msg);
          const valueRecords = await this.validateValuesInLightClient(
            account,
            data
          );
          resolve(valueRecords);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(
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
        const request = this.createGetValuesRequest(id, account, keys);
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await this.config.ipfs.pubsub.publish(requestTopic, request);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Setting and getting the received serialized map in the local light client
   * storage triggers the (write-) access controller of OrbitDb and therefore
   * validates the received serialized map.
   *
   * @param account Mina address
   * @param map serialized merkle map
   * @returns serialized merkle map
   */
  public async validateMapInLightClient(account: Address, map: string) {
    await this.createMapStoreInstanceIfNotExisting(account);

    // set and retrieve from db store
    await this.setMap(account, map);

    // do not call .getMap because the implementation differs from parent
    const mapStore = this.storeInstances[this.getZkfsMapPath(account)];
    return mapStore.get('root');
  }

  /**
   * Setting and getting the received valueRecord in the local light client
   * storage triggers the (write-) access controller of OrbitDb and therefore
   * validates the received valueRecords.
   *
   * @param account Mina address
   * @param valueRecords serialized merkle map
   * @returns serialized merkle map
   */
  public async validateValuesInLightClient(
    account: Address,
    receivedValueRecords: string
  ): Promise<ValueRecord> {
    const valueRecords: ValueRecord = JSON.parse(receivedValueRecords);
    await this.createValueStoreInstanceIfNotExisting(account);

    const store = this.getValueStore(account);

    // for each value record call this.setValue()
    const keys = Object.keys(valueRecords);
    await Promise.all(
      keys.map(
        async (key) =>
          await store.set(key, JSON.stringify(valueRecords[String(key)]))
      )
    );

    // get all value records from db
    let valueRecordsFromStore: ValueRecord = {};
    keys.forEach((key) => {
      const value = store.get(key);
      valueRecordsFromStore = {
        ...valueRecordsFromStore,
        [String(key)]: JSON.parse(value),
      };
    });
    return valueRecordsFromStore;
  }

  public async createMapStoreInstanceIfNotExisting(account: Address) {
    if (!this.storeInstances || !this.getValueStore(account)) {
      const keyValueStore = await this.createGetMapDbStore(account);
      this.saveStoreInstances([
        { [this.getZkfsMapPath(account)]: keyValueStore },
      ]);
    }
  }

  public async createValueStoreInstanceIfNotExisting(account: Address) {
    if (!this.storeInstances || !this.getMapStore(account)) {
      const keyValueStore = await this.createGetValueDbStore(account);
      this.saveStoreInstances([
        { [this.getZkfsValuePath(account)]: keyValueStore },
      ]);
    }
  }

  public async createGetMapDbStore(account: Address) {
    const dbAddress = await this.getMapOrbitDbAddress(account);
    return await this.orbitDb.keyvalue<string>(dbAddress.toString());
  }

  public async createGetValueDbStore(account: Address) {
    const dbAddress = await this.getMapOrbitDbAddress(account);
    return await this.orbitDb.keyvalue<string>(dbAddress.toString());
  }
}

export default OrbitDbStorageLight;
