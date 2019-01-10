'use strict';

/**
 *
 * This is base class for branded token deployment
 *
 * @module tools/economySetup/brandedToken/Base
 *
 */

const rootPrefix = '../../..',
  TokenModel = require(rootPrefix + '/app/models/mysql/Tokens'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/EstimateOriginChainGasPrice');

class Base {
  construtor(params) {
    const oThis = this;
    oThis.clientId = params.clientId;
    oThis.originChainId = params.originChainId;
    oThis.auxChainId = params.auxChainId;
    oThis.simpleTokenAddress = params.simpleTokenAddress;
    oThis.organizationAddress = params.organizationAddress;

    oThis.deployerAddress = null;
    oThis.gasPrice = null;
  }

  /**
   *
   * @returns {Promise<any>}
   * @private
   */
  async _fetchAndSetTokenDetails() {
    const oThis = this;

    let tokenDetails = await new TokenModel()
      .select(['id', 'client_id', 'name', 'symbol', 'conversion_factor', 'decimal'])
      .where(['client_id = ?', oThis.clientId])
      .fire();

    if (tokenDetails.length === 0) {
      logger.error('Token details not found');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_btb_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.tokenName = tokenDetails[0].name;
    oThis.tokenSymbol = tokenDetails[0].symbol;
    oThis.conversionFactor = tokenDetails[0].conversion_factor;
    oThis.decimal = tokenDetails[0].decimal;
  }

  /**
   * sets the deployer address as per the chain id passed.
   *
   * @param chainId
   * @returns {Promise<*>}
   * @private
   */
  async _fetchAndSetDeployerAddress(chainId) {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: chainId,
      kind: chainAddressConstants.deployerKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_btb_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.deployerAddress = fetchAddrRsp.data.address;
  }

  /**
   * This functions fetches and sets the gas price according to the chain kind passed to it.
   * @param chainKind
   * @returns {Promise<void>}
   * @private
   */
  async _fetchAndSetGasPrice(chainKind) {
    const oThis = this;

    switch (chainKind) {
      case coreConstants.originChainKind:
        let gasPriceCacheObj = new gasPriceCacheKlass(),
          gasPriceRsp = await gasPriceCacheObj.fetch();

        oThis.gasPrice = gasPriceRsp.data;
        break;
      case coreConstants.auxChainKind:
        // TODO :: Gasprice should not be 0 hardcoded.
        oThis.gasPrice = '0x0';
        break;
      default:
        throw `unsupported chainKind: ${chainKind}`;
    }
  }
}

module.exports = Base;
