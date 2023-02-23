/* eslint-disable unicorn/prevent-abbreviations */
import type { StorageAdapter, ValueRecord } from './interface.js';

class OrbitDbStoragePartial implements StorageAdapter {
  public isReady: () => Promise<void>;

  public initialize: () => Promise<void>;

  public getMap: (account: string) => Promise<string>;

  public setMap: (account: string, map: string) => Promise<void>;

  public setValue: (account: string, value: ValueRecord) => Promise<void>;

  public getValues: (account: string, keys: string[]) => Promise<ValueRecord>;
}

export default OrbitDbStoragePartial;
