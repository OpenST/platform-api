'use strict';

/*
 *  tools/economySetup/SetCoGatewayInUtilityBT.js
 *
 *  This class helps in setting co-gateway in UBT contract
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  SignerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const BrandedTokenHelper = require('branded-token.js');

class DeployUtilityBrandedToken {
  constructor(params) {
    const oThis = this;

    oThis.web3 = null;
    oThis.auxChainId = params.auxChainId;
    oThis.organization = params.tokenAuxOrgCntrctAddr;
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
          internal_error_identifier: 't_es_scgubt_1',
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

    await oThis._setWeb3Instance();

    await oThis._fetchGatewayAddress();

    await oThis._fetchCoGatewayAddress();

    await oThis._setCoGatewayInUBT();
  }

  /**
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.auxChainId]);

    oThis.auxChainConfig = response[oThis.auxChainId];
    oThis.wsProviders = oThis.auxChainConfig.auxGeth.readWrite.wsProviders;
    oThis.web3 = new SignerWeb3Provider(oThis.wsProviders[0], oThis.organization).getInstance();
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
          internal_error_identifier: 't_es_scgubt_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.gatewayContractAddress = fetchAddrRsp.data.address;
  }

  /**
   * _fetchCoGatewayAddress
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchCoGatewayAddress() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.auxChainId,
      kind: chainAddressConstants.auxCoGatewayContractKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_scgubt_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.coGateWayContractAddress = fetchAddrRsp.data.address;
  }

  /**
   * _setCoGatewayInUBT
   *
   * @return {Promise<void>}
   * @private
   */
  async _setCoGatewayInUBT() {
    const oThis = this;

    let brandedTokenHelper = new BrandedTokenHelper(oThis.web3);

    // txOptions, web3 are default, passed in constructor respectively
    await brandedTokenHelper.setCoGateway(oThis.coGateWayContractAddress, {}, oThis.gatewayContractAddress);
  }
}

module.exports = DeployUtilityBrandedToken;
