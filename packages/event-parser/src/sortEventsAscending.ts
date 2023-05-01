/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable id-length */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import type Events from './types.js';

/**
 * As of snarkyjs 0.9.4 events are not sorted ascending by block height,
 * when we receive events from the network.
 */
function sortEventsByBlockHeight(events: Events): Events {
  return events.slice().sort((a, b) => {
    if (a.blockHeight.lessThan(b.blockHeight).toBoolean()) {
      return -1;
    }
    if (a.blockHeight.greaterThan(b.blockHeight).toBoolean()) {
      return 1;
    }
    return 0;
  });
}

export default sortEventsByBlockHeight;
