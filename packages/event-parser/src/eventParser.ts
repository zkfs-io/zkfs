/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable new-cap */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import type { ZkfsNode } from '@zkfs/node';
import type { OrbitDbStoragePartial } from '@zkfs/storage-orbit-db';
import { Field, type Mina, PublicKey, isReady, UInt32 } from 'snarkyjs';

import sortEventsAscending from './sortEventsAscending.js';
import type Events from './types.js';
import Trigger from './trigger.js';

const defaultOption = {
  isLocalTesting: false,
};

class EventParser {
  public addressLastSeen: { [key: string]: UInt32 | undefined } | undefined;

  public zkfsNode: ZkfsNode<OrbitDbStoragePartial> | undefined;

  public constructor(
    public mina: typeof Mina,
    public options = defaultOption
  ) { }

  public processEvents(
    events: Events,
    zkfsNode: ZkfsNode<OrbitDbStoragePartial>,
    publicKey: PublicKey
  ) {
    events.forEach((eventsPerBlock) => {
      eventsPerBlock.events.forEach((event) => {
        console.log(event);
        const depth = Number(event[0]);

        const map = event[depth - 1];
        const keyInMap = event[depth];
        const valueStartsFromIndex = depth + 1;
        const value = event.slice(valueStartsFromIndex);

        zkfsNode.storage.virtualStorage.setSerializedValue(
          publicKey.toBase58(),
          map,
          keyInMap,
          value
        );
      });
    });
  }

  public getLastProcessedBlock(events: Events): UInt32 {
    // eslint-disable-next-line putout/putout
    return events[events.length - 1].blockHeight;
  }

  public setLastSeen(publicKey: PublicKey, lastSeen: UInt32) {
    const addressLastSeen = this.addressLastSeen ?? {};
    addressLastSeen[publicKey.toBase58()] = lastSeen;
    this.addressLastSeen = addressLastSeen;
  }

  public getLastSeen(publicKey: PublicKey): UInt32 {
    const addressLastSeen = this.addressLastSeen ?? {};
    return addressLastSeen[publicKey.toBase58()] ?? UInt32.from(0);
  }

  public filterEventsFromBlockHeight(events: Events, blockHeight: UInt32) {
    return events.filter((event) =>
      event.blockHeight.greaterThan(blockHeight).toBoolean()
    );
  }

  public async initialize(zkfsNode: ZkfsNode<OrbitDbStoragePartial>) {
    // for local fetching
    this.zkfsNode = zkfsNode;

    await isReady;
    const { addresses } = zkfsNode.storage.config;

    // eslint-disable-next-line max-len
    /* A hack to avoid fetching events automatically when testing with LocalBlockchain */
    if (this.options.isLocalTesting) {
      console.log('Local testing, skipping automatic fetching of events');
      console.log('Manually call zkfsNode.eventParser.fetchLocalEvents()');
      return;
    }

    // fetch events for all addresses every 180 seconds
    const trigger = new Trigger(180_000);
    trigger.register(async () => {
      await Promise.all(
        addresses.map(async (address) => {
          await this.fetchEventsForAddress(
            PublicKey.fromBase58(address),
            zkfsNode
          );
        })
      );
    });
  }

  public async fetchEventsForAddress(
    publicKey: PublicKey,
    zkfsNode: ZkfsNode<OrbitDbStoragePartial>
  ) {
    console.log('fetching')
    // todo: add support for zkApps with tokenId
    const filterOptions = { from: this.getLastSeen(publicKey) };
    const events = await this.mina.fetchEvents(
      publicKey,
      Field(1),
      filterOptions
    );

    const sortedEvents = sortEventsAscending(events);
    this.processEvents(sortedEvents, zkfsNode, publicKey);

    const lastSeen = this.getLastProcessedBlock(sortedEvents);
    this.setLastSeen(publicKey, lastSeen);
  }

  public async fetchAndProcessLocalEventsForAddress(
    publicKey: PublicKey,
    zkfsNode: ZkfsNode<OrbitDbStoragePartial>
  ) {
    const events = await this.mina.fetchEvents(publicKey, Field(1));
    const sortedEvents = sortEventsAscending(events);
    const filteredEvents = this.filterEventsFromBlockHeight(
      sortedEvents,
      this.getLastSeen(publicKey)
    );
    this.processEvents(filteredEvents, zkfsNode, publicKey);

    const lastSeen = this.getLastProcessedBlock(filteredEvents);
    this.setLastSeen(publicKey, lastSeen);
  }

  /**
   * This function fetches local events manually,
   * when testing with LocalBlockchain.
   */
  public async fetchLocalEvents() {
    if (this.zkfsNode === undefined) {
      throw new Error('Please call initialize first');
    }

    const { addresses } = this.zkfsNode.storage.config;
    await Promise.all(
      addresses.map(
        async (address) =>
          // eslint-disable-next-line max-len
          // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
          await this.fetchAndProcessLocalEventsForAddress(
            PublicKey.fromBase58(address),
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.zkfsNode!
          )
      )
    );
  }
}

export default EventParser;
