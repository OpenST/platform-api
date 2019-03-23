const setupConfig = {
  chains: {
    origin: {
      chainId: {
        value: 3
      },
      gethPort: {
        value: 30310
      },
      networkId: {
        value: 3
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
