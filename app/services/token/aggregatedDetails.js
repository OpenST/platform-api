'use strict';

/**
 * This service gets the details of the economy from economy model
 *
 * @module app/services/token/aggregatedDetails
 */

const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  economyFormatter = require(rootPrefix + '/lib/formatter/entity/economy');

const InstanceComposer = OSTBase.InstanceComposer;

class AggregatedDetails {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chain_id;
    oThis.contractAddress = params.contract_address;
  }

  /**
   * perform
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('app/services/token/aggregatedDetails::perform::catch');
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
   * asyncPerform
   *
   * @return {Promise<any>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis.getEconomyDetails();
  }

  /**
   * getEconomyDetails
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
