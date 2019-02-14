/**
 * Class for inserting block finalizer entry in cron processes table.
 *
 * @module lib/cronProcess/BlockFinalizer
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting block finalizer entry in cron processes table.
 *
 * @class
 */
class BlockFinalizer extends CronProcessBase {
  /**
   * Constructor for inserting finalizer parser entry in cron processes table.
   *
   * @param {Object} params
   * @param {Number/String} params.blockDelay
   * @param {Number/String} params.chainId
   * @param {Number/String} [params.id]
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.blockDelay = params.blockDelay;
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
    if (!CommonValidators.validateInteger(oThis.chainId)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_co_bf_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateInteger(oThis.blockDelay)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_co_bf_2',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }
    if (Number(oThis.blockDelay) < 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_co_bf_3',
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
        blockDelay: oThis.blockDelay
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

    oThis.cronKind = cronProcessesConstants.blockFinalizer;
  }
}

module.exports = BlockFinalizer;
