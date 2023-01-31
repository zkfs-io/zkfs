import { Mina, isReady, shutdown } from 'snarkyjs';

import CounterContract from './counterContract';

describe('counterContract', () => {
  beforeAll(async () => {
    await isReady;
    // eslint-disable-next-line new-cap
    const localInstance = Mina.LocalBlockchain();

    Mina.setActiveInstance(localInstance);
  });

  describe('prerequisites', () => {
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('should compile', async () => {
      expect.assertions(0);

      await CounterContract.compile();
    });
  });

  describe('storage field prefetching', () => {
    it('should analyse method storage requirements', () => {
      expect.assertions(0);

      CounterContract.analyzeOffchainStorage();
    });
  });

  afterAll(async () => {
    await shutdown();
  });
});
