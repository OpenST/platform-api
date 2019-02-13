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
    if (!CommonValidators.validateInteger(oThis.chainId)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_co_bp_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateInteger(oThis.intentionalBlockDelay)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_co_bp_2',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }
    if (Number(oThis.intentionalBlockDelay) < 0) {
      // For block parser, -1 is valid.
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_co_bp_3',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

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

    await oThis.insert(cronParams);
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