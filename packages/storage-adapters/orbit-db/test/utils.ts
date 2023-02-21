import { exec } from 'node:child_process';

const tearDownIpfs = (): void => {
  exec('rm -rf ipfs-* orbitdb', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
    }
  });
};

export default tearDownIpfs;
