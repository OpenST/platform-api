'use strict';


const rootPrefix = '../../..',
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

const fundingConfig = {
  [chainAddressConstants.deployerKind]: {
    minimum: '100000000',
    toFund: '300000000'
  }

};


class FundEthByChainOwner {
  constructor() {};

  perform() {};

  _fetchAddresses() {};

  _fetchBalances() {},

  _transfer() {}
}


new FundEthByChainOwner().perform();