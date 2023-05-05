/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable new-cap */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import type { OrbitDbStoragePartial } from '@zkfs/storage-orbit-db';
import { Field, type Mina, PublicKey, UInt32 } from 'snarkyjs';

// eslint-disable-next-line import/no-relative-packages
import type { ZkfsNode, ValueRecord } from '../../node/src/interface.js';

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
  ) {}

  public getLastProcessedBlock(events: Events): UInt32 {
    // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
    return events.at(-1).blockHeight;
  }

  public setFromBlockHeight(publicKey: PublicKey, lastSeen: UInt32) {
    const addressLastSeen = this.addressLastSeen ?? {};
    addressLastSeen[publicKey.toBase58()] = lastSeen;
    this.addressLastSeen = addressLastSeen;
  }

  public getFromBlockHeight(publicKey: PublicKey): UInt32 {
    const addressLastSeen = this.addressLastSeen ?? {};
    return addressLastSeen[publicKey.toBase58()] ?? UInt32.from(0);
  }

  public filterEventsFromBlockHeight(events: Events, blockHeight: UInt32) {
    return events.filter((event) =>
      event.blockHeight.greaterThanOrEqual(blockHeight).toBoolean()
    );
  }

  public processEventsVirtualStorage(events: Events, publicKey: PublicKey) {
    for (const eventsPerBlock of events) {
      for (const event of eventsPerBlock.events) {
        const depth = Number(event[0]);

        const map = event[depth - 1];
        const keyInMap = event[depth];
        const valueStartsFromIndex = depth + 1;
        const value = event.slice(valueStartsFromIndex);

        if (this.zkfsNode === undefined) {
          throw new Error('Call first initialize() on eventParser.');
        }

        // update the stored serialized merkle map
        this.zkfsNode.storage.virtualStorage.setSerializedValue(
          publicKey.toBase58(),
          map,
          keyInMap,
          value
        );
      }
    }
  }

  // eslint-disable-next-line max-statements
  public async processEventsDataStore(events: Events, publicKey: PublicKey) {
    for (const eventsPerBlock of events) {
      for (const event of eventsPerBlock.events) {
        const depth = Number(event[0]);

        const map = event[depth - 1];
        const keyInMap = event[depth];
        const valueStartsFromIndex = depth + 1;
        const value = event.slice(valueStartsFromIndex);

        if (this.zkfsNode === undefined) {
          throw new Error('Call first initialize() on eventParser.');
        }

        // update the stored serialized merkle map
        this.zkfsNode.storage.virtualStorage.setSerializedValue(
          publicKey.toBase58(),
          map,
          keyInMap,
          value
        );

        // save the serialized value to DB
        const combinedKey = this.zkfsNode.storage.virtualStorage.getCombinedKey(
          map,
          keyInMap
        );
        const valueRecord: ValueRecord = { [String(combinedKey)]: value };
        // eslint-disable-next-line no-await-in-loop
        await this.zkfsNode.storage.setValue(publicKey.toBase58(), valueRecord);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async initialize(zkfsNode: ZkfsNode<OrbitDbStoragePartial>) {
    this.zkfsNode = zkfsNode;

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
          await this.fetchEventsForAddress(PublicKey.fromBase58(address));
        })
      );
    });
  }

  public async fetchEventsForAddress(publicKey: PublicKey) {
    const filterOptions = { from: this.getFromBlockHeight(publicKey).add(1) };
    const events = await this.mina.fetchEvents(
      publicKey,

      // fetches events for default token id
      Field(1),
      filterOptions
    );

    const sortedEvents = sortEventsAscending(events);

    this.processEventsVirtualStorage(sortedEvents, publicKey);
    await this.processEventsDataStore(sortedEvents, publicKey);

    const lastSeen = this.getLastProcessedBlock(sortedEvents);
    this.setFromBlockHeight(publicKey, lastSeen);
  }

  public async fetchAndProcessLocalEventsForAddress(publicKey: PublicKey) {
    const events = await this.mina.fetchEvents(publicKey, Field(1));
    const sortedEvents = sortEventsAscending(events);

    // this workaround exists, because local Mina returns all events
    const processFromBlock = this.getFromBlockHeight(publicKey);
    const filteredEvents = this.filterEventsFromBlockHeight(
      sortedEvents,
      processFromBlock
    );

    this.processEventsVirtualStorage(filteredEvents, publicKey);
    await this.processEventsDataStore(filteredEvents, publicKey);

    const latestProcessedBlock = this.getLastProcessedBlock(filteredEvents);
    this.setFromBlockHeight(publicKey, latestProcessedBlock.add(1));
  }

  /**
   * This function fetches local events manually,
   * when testing with LocalBlockchain.
   */
  public async fetchLocalEvents() {
    if (this.zkfsNode === undefined) {
      throw new Error('Call first initialize() on eventParser.');
    }

    const { addresses } = this.zkfsNode.storage.config;
    await Promise.all(
      addresses.map(
        async (address) =>
          // eslint-disable-next-line max-len
          // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
          await this.fetchAndProcessLocalEventsForAddress(
            PublicKey.fromBase58(address)
          )
      )
    );
  }
}

export default EventParser;
