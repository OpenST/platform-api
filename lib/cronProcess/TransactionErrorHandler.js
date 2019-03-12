/**
 * Class for inserting balance settler worker entry in cron processes table.
 *
 * @module lib/cronProcess/BalanceSettler
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting balance settler worker entry in cron processes table.
 *
 * @class
 */
class TransactionErrorHandler extends CronProcessBase {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Number/String} params.prefetchCount
   * @param {Number/String} params.noOfRowsToProcess
   * @param {Number/String} params.maxRetry
   * * @param {Number} params.sequenceNumber
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.noOfRowsToProcess = params.noOfRowsToProcess;
    oThis.maxRetry = params.maxRetry;
    oThis.sequenceNumber = params.sequenceNumber;
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
          internal_error_identifier: 'l_cp_teh_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateNonZeroInteger(oThis.sequenceNumber)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_teh_2',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    oThis.noOfRowsToProcess = oThis.noOfRowsToProcess || 50;
    oThis.maxRetry = oThis.maxRetry || 100;

    oThis.auxChainId = Number(oThis.auxChainId);
    oThis.noOfRowsToProcess = Number(oThis.noOfRowsToProcess);
    oThis.maxRetry = Number(oThis.maxRetry);
    oThis.sequenceNumber = Number(oThis.sequenceNumber);

    await oThis.checkLatestSequenceNumber(cronProcessesConstants.auxChainIdKey, oThis.auxChainId, oThis.sequenceNumber);
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
        noOfRowsToProcess: oThis.noOfRowsToProcess,
        maxRetry: oThis.maxRetry
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
    oThis.cronKind = cronProcessesConstants.transactionErrorHandler;
  }
}

module.exports = TransactionErrorHandler;
