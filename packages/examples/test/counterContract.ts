/* eslint-disable new-cap */
import { Struct, UInt64, method } from 'snarkyjs';
import {
  OffchainState,
  OffchainStorageContract,
  offchainState,
} from '@zkfs/contract-api';

class CounterOffchainStorage extends Struct({
  value: UInt64,
}) {}

class CounterContract extends OffchainStorageContract {
  @offchainState() public counter = OffchainState.from<CounterOffchainStorage>(
    CounterOffchainStorage
  );

  @method
  public increment() {
    // retrieve the offchain state value
    const { value: counter } = this.counter.get();

    // update the counter
    counter.value = counter.value.add(1);

    // set a new offchain state value
    this.counter.set(counter);
  }
}

export default CounterContract;
export { CounterOffchainStorage };
