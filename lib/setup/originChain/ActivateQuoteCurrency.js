'use strict';

/*
 * @module lib/setup/originChain/ActivateQuoteCurrency
 *
 * Class for activating quote currency
 */

const rootPrefix = '../../..',
  quoteCurrencyConstants = require(rootPrefix + '/lib/globalConstant/quoteCurrency'),
  QuoteCurrencyModel = require(rootPrefix + '/app/models/mysql/QuoteCurrency'),
  QuoteCurrencyByIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/QuoteCurrencyById'),
  QuoteCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/QuoteCurrencyBySymbol'),
  AllQuoteCurrencySymbols = require(rootPrefix + '/lib/cacheManagement/shared/AllQuoteCurrencySymbols');

class ActivateQuoteCurrency {
  /**
   * @constructor
   *
   * @param quoteCurrencySymbol
   */
  constructor(quoteCurrencySymbol) {
    const oThis = this;

    oThis.quoteCurrencySymbol = quoteCurrencySymbol;
  }

  /**
   * perform
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    let quoteCurrencyModelObj = new QuoteCurrencyModel({});

    await quoteCurrencyModelObj
      .update({
        status: quoteCurrencyConstants.invertedStatuses[quoteCurrencyConstants.activatedStatus]
      })
      .where({
        symbol: oThis.quoteCurrencySymbol,
        status: quoteCurrencyConstants.invertedStatuses[quoteCurrencyConstants.inActiveStatus]
      })
      .fire();

    // clear caches
    let quoteCurrencyBySymbolCache = new QuoteCurrencyBySymbolCache({
      quoteCurrencySymbols: [oThis.quoteCurrencySymbol]
    });

    let cacheRsp = await quoteCurrencyBySymbolCache.fetch();

    await quoteCurrencyBySymbolCache.clear();

    let quoteCurrencyId = cacheRsp.data[oThis.quoteCurrencySymbol].id;

    let quoteCurrencyByIdCache = new QuoteCurrencyByIdCache({ quoteCurrencyIds: [quoteCurrencyId] });

    await quoteCurrencyByIdCache.clear();

    let allQuoteCurrencySymbolsCache = new AllQuoteCurrencySymbols({});

    await allQuoteCurrencySymbolsCache.clear();
  }
}

module.exports = ActivateQuoteCurrency;
