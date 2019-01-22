'use strict';
/**
 * This service gets the details of the economy from economy model
 *
 * @module app/services/token/AggregatedDetails
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  economyFormatter = require(rootPrefix + '/lib/formatter/entity/economy'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  TokenDetailCache = require(rootPrefix + '/lib/sharedCacheManagement/Token'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner');

/**
 * Class for token details.
 *
 * @class
 */
class Detail {
  /**
   *
   * @param {Object} params
   * @param {Number/String} params.client_id
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.clientId = params.client_id;

    oThis.originChainId = null;
    oThis.auxChainId = null;
  }

  /**
   * Performer
   *
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('app/services/token/Detail::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 's_t_ad_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * Async perform
   *
   * @return {Promise<any>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._setChainIds();

    await oThis._fetchTokenDetails();

    await oThis._fetchTokenAddresses();

    await oThis._getEconomyDetailsFromDdb();
  }

  /**
   *
   * Set chain ids
   *
   * @private
   */
  _setChainIds() {
    const oThis = this,
      configStrategy = oThis.ic().configStrategy;

    oThis.originChainId = configStrategy[configStrategyConstants.constants]['originChainId'];
    oThis.auxChainId = configStrategy[configStrategyConstants.auxGeth]['chainId'];
  }

  /**
   * Get economy details
   *
   * @return {Promise<*|result>}
   */
  async _getEconomyDetailsFromDdb() {
    const oThis = this;

    let blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]),
      EconomyCache = blockScannerObj.cache.Economy,
      economyCache = new EconomyCache({
        chainId: oThis.chainId,
        economyContractAddresses: [oThis.contractAddress]
      });

    let cacheRsp = await economyCache.fetch();

    let economyData = cacheRsp.data[oThis.contractAddress];

    economyData = economyFormatter.perform(economyData);

    return responseHelper.successWithData(economyData);
  }
}

InstanceComposer.registerAsShadowableClass(Detail, coreConstants.icNameSpace, 'TokenDetail');
