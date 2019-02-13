/**
 * Class for inserting master internal funder origin chain specific entry in cron processes table.
 *
 * @module lib/cronProcess/FundByMasterInternalFunderOriginChainSpecific
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting master internal funder origin chain specific entry in cron processes table.
 *
 * @class
 */
class FundByMasterInternalFunderOriginChainSpecific extends CronProcessBase {
  /**
   * Constructor for inserting master internal funder origin chain specific entry in cron processes table.
   *
   * @param {Object} params
   * @param {Number/String} params.originChainId
   * @param {Number/String} [params.id]
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.originChainId = params.originChainId;
  }

  /**
   * Main performer of the class.
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis.validate();

    await oThis.set();
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
          internal_error_identifier: 'l_co_fbmifocs_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    await oThis.checkForExistingCronPerChain(cronProcessesConstants.originChainIdKey, oThis.originChainId);
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
        originChainId: oThis.originChainId
      };

    await oThis.insert(cronParams);
  }

  /**
   * Get cron kind.
   */
  get getCronKind() {
    const oThis = this;

    oThis.cronKind = cronProcessesConstants.fundByMasterInternalFunderOriginChainSpecific;
  }
}

module.exports = FundByMasterInternalFunderOriginChainSpecific;