'use strict';

/*
 *  tools/economySetup/SetGatewayInBT.js
 *
 *  This class helps in setting gateway in BT contract
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  SignerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const BrandedTokenHelper = require('branded-token.js');

class DeployBrandedToken {
  constructor(params) {
    const oThis = this;

    oThis.web3 = null;
    oThis.originChainId = params.originChainId;
    oThis.brandedTokenContractAddress = params.brandedTokenContractAddress;
  }

  /**
   * perform
   *
   * @return {Promise|*|Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 't_es_sgbt_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * _asyncPerform
   *
   * @return {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._getOrganizationWorker();

    await oThis._setWeb3Instance();

    await oThis._fetchGatewayAddress();

    await oThis._setGatewayInBT();
  }

  /**
   * _getOrganizationWorker
   *
   * @return {Promise<never>}
   * @private
   */
  async _getOrganizationWorker() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.originChainId,
      kind: chainAddressConstants.workerKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_sgbt_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.organizationWorker = fetchAddrRsp.data.address;
  }

  /**
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId]);

    oThis.originChainConfig = response[oThis.originChainId];
    oThis.wsProviders = oThis.originChainConfig.originGeth.readWrite.wsProviders;
    oThis.web3 = new SignerWeb3Provider(oThis.wsProviders[0], oThis.organizationWorker).getInstance();
  }

  /**
   * _fetchGatewayAddress
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchGatewayAddress() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.auxChainId,
      kind: chainAddressConstants.originGatewayContractKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_sgbt_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.gatewayContractAddress = fetchAddrRsp.data.address;
  }

  /**
   * _setGatewayInBT
   *
   * @return {Promise<void>}
   * @private
   */
  async _setGatewayInBT() {
    const oThis = this;

    let brandedTokenHelper = new BrandedTokenHelper(oThis.web3, oThis.brandedTokenContractAddress);

    // txOptions, web3 are default, passed in constructor respectively
    await brandedTokenHelper.setGateway(oThis.gatewayContractAddress, oThis.organizationWorker);
  }
}

module.exports = DeployBrandedToken;
