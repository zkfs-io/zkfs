/* eslint-disable @typescript-eslint/naming-convention */
import _ from 'lodash';

const partialIpfsConfig = {
  EXPERIMENTAL: { ipnsPubsub: true },
  relay: { enabled: true, hop: { enabled: true, active: true } },
};

const emptyBootStrapList: string[] = [];
const emptyBootstrapConfig = {
  ...partialIpfsConfig,

  config: {
    Bootstrap: emptyBootStrapList,

    Addresses: { Swarm: [`/ip4/127.0.0.1/tcp/4003/ws/`] },
  },
};

function createIpfsConfigEmptyBootstrap(repo: string) {
  const config = _.cloneDeep(emptyBootstrapConfig);
  return { ...config, repo };
}

function createIpfsConfigWithBootstrap(repo: string, bootstrap: string[]) {
  const baseConfig = _.cloneDeep(emptyBootstrapConfig);
  const config = {
    Bootstrap: bootstrap.map((id) => `/ip4/127.0.0.1/tcp/4003/ws/p2p/${id}`),
    Addresses: { Swarm: [] },
  };
  return {
    ...baseConfig,
    repo,
    config: {
      Bootstrap: bootstrap.map((id) => `/ip4/127.0.0.1/tcp/4003/ws/p2p/${id}`),
      Addresses: { Swarm: [] },
    },
  };
}

export { createIpfsConfigEmptyBootstrap, createIpfsConfigWithBootstrap };
