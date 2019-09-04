/**
 * This service updates price points in block scanner.
 *
 * @module lib/updatePricePoints/UpdatePricePointsInBlockScanner
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chain/BaseCurrency');

class UpdatePricePointsInBlockScanner {
  /**
   *
   * @param params
   * @param {String} params.stakeCurrency
   * @param {String} params.quoteCurrency
   * @param {String} params.conversionRate
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.chainId = params.chainId;
    oThis.stakeCurrency = params.stakeCurrency;
    oThis.quoteCurrency = params.quoteCurrency;
    oThis.conversionRate = params.conversionRate;
  }

  /**
   * Main performer method.
   *
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('lib/updatePricePoints/UpdatePricePointsInBlockScanner::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_upp_upppibs',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: { error: error }
        });
      }
    });
  }

  /**
   * Async performer.
   *
   * @return {Promise<any>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._getDecimal();

    await oThis._updatePricePoints();

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskDone
    });
  }

  /**
   * Get decimal for base currency.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getDecimal() {
    const oThis = this;

    const BaseCurrencyCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BaseCurrencyCache'),
      baseCurrencyCacheRsp = await new BaseCurrencyCache({}).fetch();

    if (baseCurrencyCacheRsp.data[oThis.stakeCurrency]) {
      oThis.decimal = baseCurrencyCacheRsp.data[oThis.stakeCurrency].decimal;
    }
  }

  /**
   * Update price points.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _updatePricePoints() {
    const oThis = this;

    const blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]),
      LatestPricePoint = blockScannerObj.model.LatestPricePoint,
      LatestPricePointsCache = blockScannerObj.cache.LatestPricePoint;

    const updatePricePointsResponse = await new LatestPricePoint({}).updatePricePoints({
      baseCurrency: oThis.stakeCurrency,
      quoteCurrency: oThis.quoteCurrency,
      pricePoint: oThis.conversionRate,
      decimal: oThis.decimal
    });

    if (!updatePricePointsResponse.isSuccess()) {
      logger.error('Unable to update pricePoints in DDB.');
      return responseHelper.error({
        internal_error_identifier: 'l_upp_uppibs_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: { error: updatePricePointsResponse }
      });
    }

    await new LatestPricePointsCache({}).clear();

    return responseHelper.successWithData({});
  }

  /**
   * Object of config strategy class
   *
   * @return {Object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis.ic().configStrategy);

    return oThis.configStrategyObj;
  }
}

InstanceComposer.registerAsShadowableClass(
  UpdatePricePointsInBlockScanner,
  coreConstants.icNameSpace,
  'UpdatePricePointsInBlockScanner'
);

module.exports = {};
