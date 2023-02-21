const partialIpfsConfig = {
  EXPERIMENTAL: { ipnsPubsub: true },
  relay: { enabled: true, hop: { enabled: true, active: true } },
};

const createIpfsConfigBase = (instanceName: string) => {
  return {
    ...partialIpfsConfig,
    repo: instanceName,
  };
};

const createIpfsConfigOffline = (instanceName: string) => {
  const ipfsBaseConfig = createIpfsConfigBase(instanceName);

  return {
    ...ipfsBaseConfig,
    config: {
      Bootstrap: [],

      Addresses: { Swarm: [] },
    },
  };
};

const createIpfsConfigConnectingToPeers = (
  instanceName: string,
  peerIds: string[]
) => {
  const ipfsBaseConfig = createIpfsConfigBase(instanceName);

  return {
    ...ipfsBaseConfig,
    config: {
      Bootstrap: peerIds.map((id) => `/ip4/127.0.0.1/tcp/4003/ws/p2p/${id}`),
      Addresses: { Swarm: [] },
    },
  };
};

export {
  createIpfsConfigBase,
  createIpfsConfigOffline,
  createIpfsConfigConnectingToPeers,
};
