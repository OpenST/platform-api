/**
 * Class for cron processes base.
 *
 * @module lib/cronProcess/Base
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CronProcessModel = require(rootPrefix + '/app/models/mysql/CronProcesses'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

// Declare constants.
const has = Object.prototype.hasOwnProperty; // Cache the lookup once, in module scope.

/**
 * Class for cron processes base.
 *
 * @class
 */
class Base {
  /**
   * Constructor for cron processes base.
   *
   * @param {Object} params
   * @param {Number/String} [params.id]
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tableAutoIncrementId = params.id;

    oThis.getCronKind;

    oThis.cronKindInt = new CronProcessModel().invertedKinds[oThis.cronKind];
  }

  /**
   * Validate if cron kind is valid or not.
   *
   * @return {Promise<never>}
   *
   * @private
   */
  validateCronKind() {
    const oThis = this;

    if (!oThis.cronKindInt) {
      logger.error('Invalid cron kind.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_co_b_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Check if cron kind exists with the same chainId already.
   *
   * @param {String} chainIdKey
   * @param {Number/String} chainIdValue
   *
   * @return {Promise<never>}
   */
  async checkForExistingCronPerChain(chainIdKey, chainIdValue) {
    const oThis = this;

    const existingCrons = await new CronProcessModel()
        .select('*')
        .where({
          kind: oThis.cronKindInt
        })
        .fire(),
      existingCronsLength = existingCrons.length;

    for (let index = 0; index < existingCronsLength; index += 1) {
      const cronEntity = existingCrons[index],
        cronParams = JSON.parse(cronEntity.params);

      if (has.call(cronParams, chainIdKey) && +cronParams[chainIdKey] === +chainIdValue) {
        logger.error('Cron already exists for mentioned chainId.');
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_co_b_2',
            api_error_identifier: '',
            debug_options: {}
          })
        );
      }
    }
  }

  /**
   * Check if cron kind exists in the same sub-environment again.
   *
   * @return {Promise<never>}
   */
  async checkForExistingCronPerSubEnv() {
    const oThis = this;

    const existingCrons = await new CronProcessModel()
      .select('*')
      .where({
        kind: oThis.cronKindInt
      })
      .fire();

    if (existingCrons.length !== 0) {
      logger.error('Cron already exists for current sub-environment.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_co_b_3',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Check if sequence number for cron already exists for given chain Id.
   *
   * @param {String} chainIdKey
   * @param {Number/String} chainIdValue
   * @param {String/Number} sequenceNumber
   *
   * @return {Promise<never>}
   */
  async checkLatestSequenceNumber(chainIdKey, chainIdValue, sequenceNumber) {
    const oThis = this;

    const existingCrons = await new CronProcessModel()
        .select('*')
        .where({
          kind: oThis.cronKindInt
        })
        .fire(),
      existingCronsLength = existingCrons.length;

    if (existingCronsLength === 0 && +sequenceNumber !== 1) {
      logger.error('Sequence number should be 1.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_co_b_4',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    for (let index = 0; index < existingCronsLength; index += 1) {
      ///////
      const cronEntity = existingCrons[index],
        cronParams = JSON.parse(cronEntity.params);

      // If entry for cronKind does not exist for the said chain, the sequence number should always be 1.
      if (has.call(cronParams, chainIdKey) && +cronParams[chainIdKey] !== +chainIdValue && +sequenceNumber !== 1) {
        logger.error('Sequence number should be 1.');
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_co_b_5',
            api_error_identifier: '',
            debug_options: {}
          })
        );
      }

      // If entry for cronKind already exists for said chain, sequence number should be different
      // than those already existing.
      if (
        has.call(cronParams, chainIdKey) &&
        +cronParams[chainIdKey] === +chainIdValue &&
        +cronParams.sequenceNumber === +sequenceNumber
      ) {
        logger.error('Sequence number already exists.');
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_co_b_6',
            api_error_identifier: '',
            debug_options: {}
          })
        );
      }
    }
  }

  /**
   * Create entry in cron process table.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<void>}
   */
  async insert(cronParams) {
    const oThis = this;

    cronParams = cronParams ? JSON.stringify(cronParams) : null;

    const cronInsertParams = {
      kind: oThis.cronKindInt,
      kind_name: oThis.cronKind,
      params: cronParams,
      status: new CronProcessModel().invertedStatuses[cronProcessesConstants.stoppedStatus]
    };
    if (oThis.tableAutoIncrementId) {
      cronInsertParams.id = oThis.tableAutoIncrementId;
    }

    const cronProcessResponse = await new CronProcessModel().insert(cronInsertParams).fire();

    logger.win('Cron process added successfully.');
    logger.log('Cron processId: ', cronProcessResponse.insertId);

    return cronProcessResponse;
  }

  /**
   * Get cron kind.
   */
  get getCronKind() {
    throw new Error('sub-class to implement.');
  }
}

module.exports = Base;
