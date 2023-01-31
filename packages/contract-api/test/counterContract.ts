/* eslint-disable new-cap */
import { PublicKey, Struct, UInt64, method } from 'snarkyjs';

import OffchainState from '../src/offchainState';
import OffchainStorageContract from '../src/offchainStorageContract';
import offchainState from '../src/offchainStateDecorator';

class CounterOffchainStorage extends Struct({
  counter: UInt64,
  user: PublicKey,
}) {
  public doStuff() {
    return '';
  }
}

class CounterContract extends OffchainStorageContract {
  // combine state into a struct
  @offchainState() public counter = OffchainState.from<CounterOffchainStorage>(
    CounterOffchainStorage
  );

  @method
  public increment() {
    // testing
    this.counter.get();
    this.counter.assertInTree();
  }
}

export default CounterContract;
