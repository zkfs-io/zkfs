/* eslint-disable max-len */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable unicorn/prevent-abbreviations */
import { TextEncoder, TextDecoder } from 'node:util';

import { v4 as uuidv4 } from 'uuid';
import type { Message } from '@libp2p/interface-pubsub';
import type { VirtualStorage } from '@zkfs/virtual-storage';

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

/**
 * It's a class that extends the OrbitDbStoragePartial class and overrides the getMap and getValues
 * methods to use the light client
 */
class OrbitDbStorageLight extends OrbitDbStoragePartial {
  public lightClientConfig: OrbitDbStorageLightConfig;

  public override databasePrefix = 'lightClient.';

  public constructor(config: OrbitDbStorageLightConfig) {
    super({ ...config, addresses: [] });
    this.lightClientConfig = config;
  }

  /**
   * It takes a key and an account address and returns a request body that can be sent to the contract
   *
   * @param {string} id - A unique identifier for the request.
   * @param {Address} account - The account address of the user who is making the request.
   * @param {string} key - The key of the map you want to get.
   * @returns A byte array of the request body.
   */
  public createGetMapRequest(id: string, account: Address, key: string) {
    const requestBody: RequestSchemaType = {
      id,
      type: 'getMap',
      payload: { key, account },
    };
    return new TextEncoder().encode(JSON.stringify(requestBody));
  }

  /**
   * It takes an id, an account address, and an array of keys, and returns a request body that can be
   * sent to the API
   *
   * @param {string} id - A unique identifier for the request.
   * @param {Address} account - The account address of the user who is making the request.
   * @param {string[]} keys - The keys you want to get the values for.
   * @returns A byte array of the request body.
   */
  public createGetValuesRequest(id: string, account: Address, keys: string[]) {
    const requestBody: RequestSchemaType = {
      id,
      type: 'getValues',
      payload: { key: JSON.stringify(keys), account },
    };
    return new TextEncoder().encode(JSON.stringify(requestBody));
  }

  /**
   * It takes a PubSub message, decodes it, validates it, and returns the data
   *
   * @param {Message} msg - Message - The message object that is returned from the PubSub subscription.
   * @returns The data from the pubsub message.
   */
  public getDataFromPubSubMessage(msg: Message) {
    try {
      const decodedResponseMessage = new TextDecoder().decode(msg.data);
      const { data } = responseValidation.verify(
        JSON.parse(decodedResponseMessage)
      ).payload;
      return data ?? undefined;
    } catch (error) {
      console.error('Error decoding orbit-db data provider response', error);
      return undefined;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async getWitness(
    account: string,
    mapName: string
  ): Promise<string | undefined> {
    throw new Error('Not implemented');
  }

  /**
   * It subscribes to a response topic, publishes a request to the request topic,
   * and then waits for a response to the first topic.
   *
   * @param {Address} account - Address - The account address to get the map for
   * @returns A promise that resolves to a string.
   */
  public override async getMap(
    account: Address,
    mapName: string
  ): Promise<string | undefined> {
    // eslint-disable-next-line promise/avoid-new, no-async-promise-executor
    return await new Promise<string | undefined>(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // eslint-disable-next-line prefer-promise-reject-errors
        reject(undefined);
      }, this.lightClientConfig.pubsub.timeout);

      // subscribe to response
      const onResponseHandler = async (msg: Message) => {
        clearTimeout(timeoutId);

        const data = this.getDataFromPubSubMessage(msg);
        if (data === undefined) {
          resolve(undefined);
        } else {
          const map = await this.validateMapInLightClient(
            account,
            data,
            mapName
          );
          resolve(map);
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
        const request = this.createGetMapRequest(id, account, mapName);
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await this.config.ipfs.pubsub.publish(requestTopic, request);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * It subscribes to a response topic, publishes a request to the topic,
   * and then waits for a response to the first topic.
   *
   * @param {Address} account - The account address to get the values for
   * @param {string[]} keys - All keys of ValueRecords that are requested
   * @returns A promise that resolves to a ValueRecord.
   */
  public override async getValues(
    account: Address,
    keys: string[]
  ): Promise<ValueRecord | undefined> {
    // eslint-disable-next-line promise/avoid-new
    return await new Promise<ValueRecord | undefined>(
      // eslint-disable-next-line no-async-promise-executor
      async (resolve, reject) => {
        const timeoutId = setTimeout(() => {
          // eslint-disable-next-line prefer-promise-reject-errors
          reject(undefined);
        }, this.lightClientConfig.pubsub.timeout);

        // subscribe to response
        const onResponseHandler = async (msg: Message) => {
          clearTimeout(timeoutId);

          const data = this.getDataFromPubSubMessage(msg);
          if (data === undefined) {
            resolve(undefined);
          } else {
            const valueRecords = await this.validateValuesInLightClient(
              account,
              data
            );
            resolve(valueRecords);
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
      }
    );
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
  public async validateMapInLightClient(
    account: Address,
    map: string,
    mapName: string
  ): Promise<string | undefined> {
    await this.createMapStoreInstanceIfNotExisting(account);

    // set and retrieve from db store
    await this.setMap(account, map, mapName);

    // do not call .getMap because the implementation differs from parent
    const mapStore = this.getMapStore(account);
    return mapStore?.get(mapName);
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
  ): Promise<ValueRecord | undefined> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const valueRecords: ValueRecord = JSON.parse(receivedValueRecords);
    await this.createValueStoreInstanceIfNotExisting(account);

    const store = this.getValueStore(account);

    // for each value record call this.setValue()
    await Promise.all(
      Object.entries(valueRecords).map(
        async ([key, value]) => await store?.set(key, JSON.stringify(value))
      )
    );

    // get all value records from db
    let valueRecordsFromStore: ValueRecord = {};
    Object.keys(valueRecords).forEach((key) => {
      // store was created earlier
      const value = store!.get(key);
      valueRecordsFromStore = {
        ...valueRecordsFromStore,
        [String(key)]: JSON.parse(value),
      };
    });
    return valueRecordsFromStore;
  }

  /**
   * If the store instance for the account doesn't exist, create it
   *
   * @param {Address} account - Address of the account that is being used to create the map store
   * instance.
   */
  public async createMapStoreInstanceIfNotExisting(account: Address) {
    if (this.storeInstances && this.getMapStore(account)) {
      return;
    }

    const keyValueStore = await this.createGetMapDbStore(account);
    this.saveStoreInstances([
      { [this.getZkfsMapPath(account)]: keyValueStore },
    ]);
  }

  /**
   * If the storeInstances object doesn't exist or the account's store
   * doesn't exist, create a new store and save it to the storeInstances object
   *
   * @param {Address} account - for which the value store is being created.
   */
  public async createValueStoreInstanceIfNotExisting(account: Address) {
    if (this.storeInstances && this.getValueStore(account)) {
      return;
    }

    const keyValueStore = await this.createGetValueDbStore(account);
    this.saveStoreInstances([
      { [this.getZkfsValuePath(account)]: keyValueStore },
    ]);
  }

  /**
   * Create a key-value store for merkle maps for the given account
   *
   * @param {Address} account - The account address of the user.
   * @returns A key value store.
   */
  public async createGetMapDbStore(account: Address) {
    if (!this.orbitDb) {
      throw new Error(
        'OrbitDb instance undefined, have you called .initialized()?'
      );
    }
    const dbAddress = await this.getMapOrbitDbAddress(account);
    return await this.orbitDb.keyvalue<string>(dbAddress.toString());
  }

  /**
   * Create a key-value store for merkle map values for the given account
   *
   * @param {Address} account - Address - The account address of the user
   * @returns A key value store.
   */
  public async createGetValueDbStore(account: Address) {
    if (!this.orbitDb) {
      throw new Error(
        'OrbitDb instance undefined, have you called .initialized()?'
      );
    }
    const dbAddress = await this.getValueOrbitDbAddress(account);
    return await this.orbitDb.keyvalue<string>(dbAddress.toString());
  }
}

export default OrbitDbStorageLight;
