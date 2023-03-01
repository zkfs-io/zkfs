const partialIpfsConfig = {
  EXPERIMENTAL: { ipnsPubsub: true },
  relay: { enabled: true, hop: { enabled: true, active: true } },
};

function ipfsPeerNodeConfig(repo: string) {
  return {
    ...partialIpfsConfig,
    repo,

    config: {
      // empty bootstrap !
      Bootstrap: [],
      Addresses: { Swarm: [`/ip4/127.0.0.1/tcp/4003/ws/`] },
    },
  };
}

function ipfsLightClientConfig(repo: string, peerNodeId: string) {
  return {
    ...partialIpfsConfig,
    repo,

    config: {
      Bootstrap: [`/ip4/127.0.0.1/tcp/4003/ws/p2p/${peerNodeId}`],
      Addresses: { Swarm: [] },
    },
  };
}

const defaultStorageOptions = {
  bootstrap: { interval: 1000, timeout: 15_000 },
  pubsub: { timeout: 10_000 },
};

export {
  ipfsLightClientConfig,
  ipfsPeerNodeConfig,
  defaultStorageOptions,
  partialIpfsConfig,
};
