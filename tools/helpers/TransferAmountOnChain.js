'use strict';

const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../..',
  InstanceComposer = OSTBase.InstanceComposer,
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

class TransferAmountOnChain {
  constructor() {}

  async _fundAddressWithEth(address, chainId, web3Instance, amountInWei) {
    const oThis = this;

    /*let providers = await oThis._getProvidersFromConfig(),
      provider = providers.data[0], //select one provider from provider endpoints array
      web3ProviderInstance = await web3Provider.getInstance(provider),
      web3Instance = await web3ProviderInstance.web3WsProvider;*/

    let sealerAddress = await new ChainAddressModel().fetchAddress({
      chainId: chainId,
      kind: chainAddressConstants.sealerKind
    });

    let txParams = {
      from: sealerAddress.data.addresses[0],
      to: address,
      value: amountInWei //transfer amt in wei
    };

    await web3Instance.eth
      .sendTransaction(txParams)
      .then(function(response) {
        logger.log('Successfully funded to address -> ', response.to);
        Promise.resolve();
      })
      .catch(function(error) {
        logger.error(error);
        Promise.reject();
      });
  }
}

module.exports = new TransferAmountOnChain();
