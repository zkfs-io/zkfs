/* eslint-disable no-console */
import { fetchLastBlock, type UInt32 } from 'snarkyjs';

async function getCurrentBlockLength(): Promise<UInt32> {
  const { blockchainLength } = await fetchLastBlock(
    'https://proxy.berkeley.minaexplorer.com/graphql'
  );
  return blockchainLength;
}

/**
 * It waits until the current block height has increased.
 *
 * @param [retries=20] - The number of times to retry before timing out.
 * @param [interval=30000] - the time in milliseconds between each check.
 */
// eslint-disable-next-line max-len
// eslint-disable-next-line import/no-unused-modules, import/prefer-default-export
export async function waitUntilNextBlock(
  retries = 40,
  interval = 30_000
): Promise<void> {
  // eslint-disable-next-line max-len
  // eslint-disable-next-line no-async-promise-executor, promise/avoid-new, @typescript-eslint/no-misused-promises
  await new Promise<void>(async (resolve, reject) => {
    const timeoutMilliseconds = retries * interval;
    const timeoutId = setTimeout(() => {
      reject(
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        new Error(`Reached timeout after ${timeoutMilliseconds / 1000} seconds`)
      );
    }, timeoutMilliseconds);

    const startingHeight = await getCurrentBlockLength();

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const timerId = setInterval(async () => {
      const currentHeight = await getCurrentBlockLength();
      const hasIncreased = currentHeight.greaterThan(startingHeight);

      if (hasIncreased.toBoolean()) {
        const start = startingHeight.toString();
        const current = currentHeight.toString();
        console.log(
          `Block has increased from ${start} to ${current}, continuing...`
        );

        clearTimeout(timeoutId);
        clearInterval(timerId);
        resolve();
      }
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      console.log(`Retrying in ${interval / 1000} seconds...`);
    }, interval);
  });
}
