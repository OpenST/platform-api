/**
 * Class for inserting fund from sealer aux chain specific entry in cron processes table.
 *
 * @module lib/cronProcess/FundBySealerAuxChainSpecific
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting fund from sealer aux chain specific entry in cron processes table.
 *
 * @class
 */
class FundBySealerAuxChainSpecific extends CronProcessBase {
  /**
   * Constructor for inserting fund from sealer aux chain specific entry in cron processes table.
   *
   * @param {Object} params
   * @param {Number/String} params.originChainId
   * @param {Number/String} params.auxChainId
   * @param {Number/String} [params.id]
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.auxChainId = params.auxChainId;
  }

  /**
   * Main performer of the class.
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis.validate();

    return oThis.set();
  }

  /**
   * Validate cron params.
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async validate() {
    const oThis = this;

    // Call validate method of base class.
    oThis.validateCronKind();

    // Parameter validations.
    if (!CommonValidators.validateInteger(oThis.originChainId)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_co_fbsacs_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    // Parameter validations.
    if (!CommonValidators.validateInteger(oThis.auxChainId)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_co_fbsacs_2',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    await oThis.checkForExistingCronPerChain(cronProcessesConstants.auxChainIdKey, oThis.auxChainId);
  }

  /**
   * Set cron in cron processes table.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async set() {
    const oThis = this,
      cronParams = {
        originChainId: oThis.originChainId,
        auxChainId: oThis.auxChainId
      };

    // Create entry in cron process table.
    let cronProcessResponse = await oThis.insert(cronParams);

    return cronProcessResponse.insertId;
  }

  /**
   * Get cron kind.
   */
  get getCronKind() {
    const oThis = this;

    oThis.cronKind = cronProcessesConstants.fundBySealerAuxChainSpecific;
  }
}

module.exports = FundBySealerAuxChainSpecific;
