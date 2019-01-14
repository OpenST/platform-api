const setupConfig = {
  chains: {
    origin: {
      chainId: {
        value: 1000
      },
      gethPort: {
        value: 30310
      },
      networkId: {
        value: 1000
      }
    },
    aux: {
      chainId: {
        value: 2000
      },
      gethPort: {
        value: 30311
      },
      networkId: {
        value: 2000
      }
    }
  }
};

module.exports = setupConfig;
