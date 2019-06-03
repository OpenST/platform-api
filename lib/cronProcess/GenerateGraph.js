/**
 * Class for inserting generate graph entry in cron processes table.
 *
 * @module lib/cronProcess/GenerateGraph
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting generate graph entry in cron processes table.
 *
 * @class
 */
class GenerateGraph extends CronProcessBase {
  /**
   * Constructor for inserting workflow worker entry in cron processes table.
   *
   * @param {object} params
   * @param {number/string} params.auxChainId
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

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
    if (!CommonValidators.validateNonNegativeInteger(oThis.auxChainId)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_gg_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    oThis.auxChainId = Number(oThis.auxChainId);

    await oThis.checkForExistingCronPerChain(cronProcessesConstants.chainIdKey, oThis.auxChainId);
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
        auxChainId: oThis.auxChainId
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

    oThis.cronKind = cronProcessesConstants.generateGraph;
  }
}

module.exports = GenerateGraph;
