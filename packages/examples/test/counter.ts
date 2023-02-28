import { method, UInt64 } from 'snarkyjs';
import {
  offchainState,
  OffchainStateContract,
  OffchainState,
} from '@zkfs/contract-api';

class Counter extends OffchainStateContract {
  @offchainState() public count = OffchainState.fromRoot<UInt64>(UInt64);

  public init() {
    super.init();
    this.count.set(UInt64.from(0));
  }

  @method
  public update() {
    const currentCount = this.count.get();
    const newCount = currentCount.add(1);
    this.count.set(newCount);
  }
}

export default Counter;
