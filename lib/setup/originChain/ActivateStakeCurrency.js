'use strict';

/*
 * Class for activating stake currency
 */

const rootPrefix = '../../..',
  StakeCurrencyModel = require(rootPrefix + '/app/models/mysql/StakeCurrency'),
  StakeCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyBySymbol'),
  StakeCurrencyById = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyById'),
  stakeCurrencyConstants = require(rootPrefix + '/lib/globalConstant/stakeCurrency'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class ActivateStakeCurrency {
  /**
   * @constructor
   *
   * @param stakeCurrencySymbol
   */
  constructor(stakeCurrencySymbol) {
    const oThis = this;

    oThis.stakeCurrencySymbol = stakeCurrencySymbol;
  }

  /**
   * perform
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    let stakeCurrencyModel = new StakeCurrencyModel();

    await stakeCurrencyModel
      .update({
        status: stakeCurrencyConstants.invertedStatuses[stakeCurrencyConstants.activeStatus]
      })
      .where({
        symbol: oThis.stakeCurrencySymbol,
        status: stakeCurrencyConstants.invertedStatuses[stakeCurrencyConstants.setupInProgressStatus]
      })
      .fire();

    // clear caches
    let stakeCurrencyBySymbolCache = new StakeCurrencyBySymbolCache({
      stakeCurrencySymbols: [oThis.stakeCurrencySymbol]
    });

    let cacheResponse = await stakeCurrencyBySymbolCache.fetch();

    await stakeCurrencyBySymbolCache.clear();

    let stakeCurrencyId = cacheResponse.data[oThis.stakeCurrencySymbol].id;

    await new StakeCurrencyById({
      stakeCurrencyIds: [stakeCurrencyId]
    }).clear();

    return responseHelper.successWithData({});
  }
}

module.exports = ActivateStakeCurrency;
