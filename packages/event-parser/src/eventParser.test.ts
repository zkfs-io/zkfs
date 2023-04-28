/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { isReady, type Mina } from 'snarkyjs';
import { OrbitDbStoragePartial } from '@zkfs/storage-orbit-db';
import { VirtualStorage } from '@zkfs/virtual-storage';
import type { IPFS } from 'ipfs-core';
import { ZkfsNode } from '@zkfs/node';
import { jest } from '@jest/globals';

import {
  counterTestData,
  piggyBankTestData,
  concurrentCounterTestData,
} from '../test/eventData.js';

import EventParser from './eventParser.js';
import { ValueRecord } from '@zkfs/node/src/interface.js';

describe('eventParser', () => {
  beforeAll(async () => {
    await isReady;
  });

  const address = 'B62qiyp9W7f4j9gf1Y5zrKGGxih9KwMb1mtpFsUb1QRPBfkKQ17SPAY';
  // eslint-disable-next-line @typescript-eslint/init-declarations
  let storage: OrbitDbStoragePartial;

  beforeEach(() => {
    const mockIpfs = {} as IPFS;
    const virtualStorage = new VirtualStorage();

    storage = new OrbitDbStoragePartial({
      addresses: [address],
      virtualStorage,
      bootstrap: { interval: 1000, timeout: 15_000 },
      ipfs: mockIpfs,
    });
  });

  it('parses events for piggyBank example', async () => {
    expect.assertions(3);

    // eslint-disable-next-line putout/putout
    const mockStorageSetValue = jest.fn(
      async (account: string, valueRecord: ValueRecord) => { }
    );
    storage.setValue = mockStorageSetValue;

    const mockMina = {
      fetchEvents: () => piggyBankTestData.events,
    } as unknown as typeof Mina;

    const eventParser = new EventParser(mockMina, { isLocalTesting: true });

    const zkfsNode = new ZkfsNode<OrbitDbStoragePartial>({
      storage,
      services: [],

      // @ts-expect-error - Add generic type to EventParser
      eventParser,
    });

    await eventParser.initialize(zkfsNode);

    await eventParser.fetchLocalEvents();

    const rootMap = storage.virtualStorage.getMap(
      address,
      piggyBankTestData.maps.rootMap.name
    );

    expect(rootMap.getRoot().toString()).toBe(
      piggyBankTestData.maps.rootMap.hash
    );

    const nestedMap = storage.virtualStorage.getMap(
      address,
      piggyBankTestData.maps.depositsMap.name
    );

    expect(nestedMap.getRoot().toString()).toBe(
      piggyBankTestData.maps.depositsMap.hash
    );

    expect(mockStorageSetValue.mock.calls).toHaveLength(5);
  });

  it('parses events for counter example', async () => {
    expect.assertions(2);

    // eslint-disable-next-line putout/putout
    const mockStorageSetValue = jest.fn(
      async (account: string, valueRecord: ValueRecord) => { }
    );
    storage.setValue = mockStorageSetValue;

    const mockMina = {
      fetchEvents: () => counterTestData.events,
    } as unknown as typeof Mina;

    const eventParser = new EventParser(mockMina, { isLocalTesting: true });

    const zkfsNode = new ZkfsNode<OrbitDbStoragePartial>({
      storage,
      services: [],

      // @ts-expect-error - Add generic type to EventParser
      eventParser,
    });
    await eventParser.initialize(zkfsNode);

    await eventParser.fetchLocalEvents();

    const rootMap = storage.virtualStorage.getMap(
      address,
      counterTestData.maps.rootMap.name
    );

    expect(rootMap.getRoot().toString()).toBe(
      counterTestData.maps.rootMap.hash
    );

    expect(mockStorageSetValue.mock.calls).toHaveLength(3);
  });

  it('parses events for concurrentCounter example', async () => {
    expect.assertions(3);

    // eslint-disable-next-line putout/putout
    const mockStorageSetValue = jest.fn(
      async (account: string, valueRecord: ValueRecord) => { }
    );
    storage.setValue = mockStorageSetValue;

    const mockMina = {
      fetchEvents: () => concurrentCounterTestData.events,
    } as unknown as typeof Mina;

    const eventParser = new EventParser(mockMina, { isLocalTesting: true });

    const zkfsNode = new ZkfsNode<OrbitDbStoragePartial>({
      storage,
      services: [],

      // @ts-expect-error - Add generic type to EventParser
      eventParser,
    });
    await eventParser.initialize(zkfsNode);

    await eventParser.fetchLocalEvents();

    const rootMap = storage.virtualStorage.getMap(
      address,
      concurrentCounterTestData.maps.rootMap.name
    );

    expect(rootMap.getRoot().toString()).toBe(
      concurrentCounterTestData.maps.rootMap.hash
    );

    const counters = storage.virtualStorage.getMap(
      address,
      concurrentCounterTestData.maps.countersMap.name
    );

    expect(counters.getRoot().toString()).toBe(
      concurrentCounterTestData.maps.countersMap.hash
    );

    expect(mockStorageSetValue.mock.calls).toHaveLength(3);
  });
});
