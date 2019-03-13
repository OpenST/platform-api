/**
 * Class for inserting block parser entry in cron processes table.
 *
 * @module lib/cronProcess/BlockParser
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting block parser entry in cron processes table.
 *
 * @class
 */
class BlockParser extends CronProcessBase {
  /**
   * Constructor for inserting block parser entry in cron processes table.
   *
   * @param {Object} params
   * @param {Number/String} params.intentionalBlockDelay
   * @param {Number/String} params.chainId
   * @param {Number/String} [params.id]
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.intentionalBlockDelay = params.intentionalBlockDelay;
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
    if (!CommonValidators.validateNonZeroInteger(oThis.chainId)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_bp_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateInteger(oThis.intentionalBlockDelay)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_bp_2',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }
    if (Number(oThis.intentionalBlockDelay) < 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_bp_3',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    oThis.chainId = Number(oThis.chainId);
    oThis.intentionalBlockDelay = Number(oThis.intentionalBlockDelay);

    await oThis.checkForExistingCronPerChain(cronProcessesConstants.chainIdKey, oThis.chainId);
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
        chainId: oThis.chainId,
        intentionalBlockDelay: oThis.intentionalBlockDelay
      };

    // Create entry in cron process table.
    const cronProcessResponse = await oThis.insert(cronParams);

    return cronProcessResponse.insertId;
  }

  /**
   * Get cron kind.
   */
  get getCronKind() {
    const oThis = this;

    oThis.cronKind = cronProcessesConstants.blockParser;
  }
}

module.exports = BlockParser;
