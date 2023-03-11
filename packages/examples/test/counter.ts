import { Circuit, method, UInt64 } from 'snarkyjs';
import {
  offchainState,
  OffchainStateContract,
  OffchainState,
} from '@zkfs/contract-api';

class Counter extends OffchainStateContract {
  @offchainState() public count1 = OffchainState.fromRoot<UInt64>(UInt64);

  @offchainState() public count2 = OffchainState.fromRoot<UInt64>(UInt64);

  public init() {
    super.init();
    this.count1.set(UInt64.from(0));
    this.count2.set(UInt64.from(0));

    Circuit.log('count1', this.count1.key?.toField());
    Circuit.log('count2', this.count2.key?.toField());
  }

  @method
  public update() {
    // const currentCount = this.count.get();
    // const newCount = currentCount.add(1);
    // this.count.set(newCount);
  }
}

export default Counter;
