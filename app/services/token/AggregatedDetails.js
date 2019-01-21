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
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner');

/**
 * Class for aggregated economy details.
 *
 * @class
 */
class AggregatedDetails {
  /**
   * Constructor for aggregated economy details.
   *
   * @param {Object} params
   * @param {Number/String} params.chain_id
   * @param {String} params.contract_address
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chain_id;
    oThis.contractAddress = params.contract_address;
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
        logger.error('app/services/token/AggregatedDetails::perform::catch');
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

    await oThis.getEconomyDetails();
  }

  /**
   * Get economy details
   *
   * @return {Promise<*|result>}
   */
  async getEconomyDetails() {
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

InstanceComposer.registerAsShadowableClass(AggregatedDetails, coreConstants.icNameSpace, 'TokenAggregatedDetails');
