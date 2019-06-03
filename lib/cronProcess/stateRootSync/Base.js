/**
 * Inserts state root sync cron entry in cron processes table.
 *
 * @module lib/cronProcess/stateRootSync/Base
 */

const rootPrefix = '../../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for inserting state root sync cron entry in cron processes table.
 *
 * @class StateRootSyncCronBase
 */
class StateRootSyncCronBase extends CronProcessBase {
  /**
   * Constructor for inserting state root sync cron entry in cron processes table.
   *
   * @param {object} params
   * @param {number/string} params.originChainId
   * @param {number/string} params.auxChainId
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

    await oThis.validateAndSanitize();

    return oThis.set();
  }

  /**
   * Validate cron params.
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async validateAndSanitize() {
    const oThis = this;

    // Call validate method of base class.
    oThis.validateCronKind();

    // Parameter validations.
    if (!CommonValidators.validateNonZeroInteger(oThis.auxChainId)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_bs_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateNonZeroInteger(oThis.auxChainId)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_bs_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    oThis.auxChainId = Number(oThis.auxChainId);
    oThis.originChainId = Number(oThis.originChainId);
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
        auxChainId: oThis.auxChainId,
        originChainId: oThis.originChainId
      };

    // Create entry in cron process table.
    const cronProcessResponse = await oThis.insert(cronParams);

    return cronProcessResponse.insertId;
  }

  /**
   * Get cron kind.
   */
  get getCronKind() {
    throw new Error('Sub-class to implement.');
  }
}

module.exports = StateRootSyncCronBase;
