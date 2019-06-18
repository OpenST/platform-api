'use strict';
/**
 * Module to populate preferred display currency in tokens
 *
 * @module executables/oneTimers/multipleQuoteCurrencies/populatePreferredDisplayCurrencyInTokens
 */

const rootPrefix = '../../..',
  quoteCurrencyConstants = require(rootPrefix + '/lib/globalConstant/quoteCurrency'),
  QuoteCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/QuoteCurrencyBySymbol'),
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  TokenByClientIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  TokenByTokenIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenByTokenId');

class PopulateQuoteCurrencyId {
  constructor() {}

  /**
   * Perform
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._fetchTokens();

    await oThis._updateTokens();

    await oThis._flushCaches();
  }

  /**
   * Fetch tokens
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchTokens() {
    const oThis = this;

    oThis.tokenRows = await new TokenModel({}).select('id, client_id').fire();
  }

  /**
   * Update preferred quote currency id
   *
   * @return {Promise<void>}
   * @private
   */
  async _updateTokens() {
    const oThis = this;

    // Fetch USD quote currency id
    let quoteCurrencyBySymbolCache = new QuoteCurrencyBySymbolCache({
      quoteCurrencySymbols: [quoteCurrencyConstants.USD]
    });

    let quoteCurrencyCacheRsp = await quoteCurrencyBySymbolCache.fetch();

    let quoteCurrencyData = quoteCurrencyCacheRsp.data;

    // update quote currency id
    await new TokenModel({})
      .update({ preferred_display_currency_id: quoteCurrencyData[quoteCurrencyConstants.USD].id })
      .fire();
  }

  /**
   * Flush token caches
   *
   * @return {Promise<void>}
   * @private
   */
  async _flushCaches() {
    const oThis = this;

    let promiseArray = [];
    for (let i = 0; i < oThis.tokenRows.length; i++) {
      promiseArray.push(
        new TokenByClientIdCache({
          clientId: oThis.tokenRows[i].id
        }).clear()
      );

      promiseArray.push(
        new TokenByTokenIdCache({
          tokenId: oThis.tokenRows[i].client_id
        }).clear()
      );
    }

    await Promise.all(promiseArray);
  }
}

let populateQuoteCurrencyId = new PopulateQuoteCurrencyId();

populateQuoteCurrencyId
  .perform()
  .then(function(resp) {
    console.log(resp);
    process.exit(0);
  })
  .catch(function(err) {
    console.error(err);
    process.exit(1);
  });
