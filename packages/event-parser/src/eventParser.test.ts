/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { isReady, type Mina } from 'snarkyjs';
import { OrbitDbStoragePartial } from '@zkfs/storage-orbit-db';
import { VirtualStorage } from '@zkfs/virtual-storage';
import type { IPFS } from 'ipfs-core';
import { ZkfsNode } from '@zkfs/node';
// eslint-disable-next-line @typescript-eslint/no-shadow
import { jest } from '@jest/globals';
import type { ValueRecord, ConsensusBridge } from '@zkfs/node/src/interface.js';

import {
  counterTestData,
  piggyBankTestData,
  concurrentCounterTestData,
} from '../test/eventData.js';

import EventParser from './eventParser.js';

// eslint-disable-next-line func-style
const mockImplementation = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  account: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  valueRecord: ValueRecord
  // eslint-disable-next-line @typescript-eslint/no-empty-function
) => {};

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
      // eslint-disable-next-line putout/putout
      ipfs: mockIpfs,
    });
  });

  it('parses events for piggyBank example', async () => {
    expect.assertions(3);

    const mockStorageSetValue = jest.fn(mockImplementation);
    storage.setValue = mockStorageSetValue;

    const mockMina = {
      fetchEvents: () => piggyBankTestData.events,
    } as unknown as typeof Mina;

    const mockConsensus = {} as unknown as ConsensusBridge;

    const eventParser = new EventParser(mockMina, { isLocalTesting: true });

    const zkfsNode = new ZkfsNode<OrbitDbStoragePartial>({
      // eslint-disable-next-line putout/putout
      consensus: mockConsensus,
      storage,
      services: [],
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

    const mockStorageSetValue = jest.fn(mockImplementation);
    storage.setValue = mockStorageSetValue;

    const mockMina = {
      fetchEvents: () => counterTestData.events,
    } as unknown as typeof Mina;

    const mockConsensus = {} as unknown as ConsensusBridge;

    const eventParser = new EventParser(mockMina, { isLocalTesting: true });

    const zkfsNode = new ZkfsNode<OrbitDbStoragePartial>({
      // eslint-disable-next-line putout/putout
      consensus: mockConsensus,
      storage,
      services: [],
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

    const mockStorageSetValue = jest.fn(mockImplementation);
    storage.setValue = mockStorageSetValue;

    const mockMina = {
      fetchEvents: () => concurrentCounterTestData.events,
    } as unknown as typeof Mina;

    const mockConsensus = {} as unknown as ConsensusBridge;

    const eventParser = new EventParser(mockMina, { isLocalTesting: true });

    const zkfsNode = new ZkfsNode<OrbitDbStoragePartial>({
      // eslint-disable-next-line putout/putout
      consensus: mockConsensus,
      storage,
      services: [],
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
