'use strict';

const rootPrefix = '..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  TxCronProcessDetailsModel = require(rootPrefix + '/app/models/mysql/TxCronProcessDetails'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  CronProcessModel = require(rootPrefix + '/app/models/mysql/CronProcesses');

class AddCronProcess {
  /**
   *
   * @param {object} params
   * @param {number} params.chain_id
   * @param {string} params.ipAddress
   * @param {object} params.cronParams
   * @param {string} params.kind
   * @param {string} params.status
   * @param {object} params.options
   * @param {object} params.options.queue_topic_suffix - mandatorily required only for execute_transaction cron
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.tableAutoIncrementId = params.id;

    oThis.chainId = params.chain_id;
    oThis.ipAddress = params.ip_address;
    oThis.cronParams = params.cron_params;
    oThis.kindStr = params.kind;
    oThis.statusStr = params.status;

    oThis.options = params.options || {};
    oThis.status = null;
    oThis.kind = null;
  }

  /**
   * Perform
   *
   * @returns {Promise}
   */
  async perform() {
    const oThis = this;

    oThis._validateAndSanitize();

    return oThis._addCronProcess();
  }

  /**
   * Validate and sanitize
   *
   * @private
   */
  _validateAndSanitize() {
    const oThis = this;

    if (!oThis.kindStr || !oThis.ipAddress || !oThis.statusStr) {
      logger.error('Mandatory parameters are missing. Please check kind, ipAddress, status, chainId are sent.');
      throw 'Mandatory parameters are missing.';
    }
    if (typeof oThis.ipAddress !== 'string') {
      logger.error('ipAddress ko String bhejo...');
      throw TypeError('Insertion parameters are of wrong params types.');
    }

    oThis.status = new CronProcessModel().invertedStatuses[oThis.statusStr];
    oThis.kind = new CronProcessModel().invertedKinds[oThis.kindStr];

    if (!oThis.status) {
      logger.error('"', oThis.statusStr, '" status Galat hai... Please check in CronProcesses Model');
      throw TypeError('Invalid status.');
    }
    if (!oThis.kind) {
      logger.error('"', oThis.kindStr, '" kind Galat hai... Please check in CronProcesses Model');
      throw TypeError('Invalid kind.');
    }

    oThis.cronParams = oThis.cronParams ? JSON.stringify(oThis.cronParams) : null;

    return;
  }

  /**
   * Add cron process based on kind.
   *
   * @returns {Promise}
   *
   * @private
   */
  async _addCronProcess() {
    const oThis = this;

    if (new CronProcessModel().kinds[oThis.kind] == cronProcessesConstants.executeTransaction) {
      return oThis._createExTxCronProcess();
    } else {
      return oThis._createCronProcess();
    }
  }

  /**
   * Create Execute Transaction cron
   *
   * @returns {Promise}
   * @private
   */
  async _createExTxCronProcess() {
    const oThis = this;

    if (!oThis.options.queue_topic_suffix) {
      logger.error('Sorry Yarr... queue_topic_suffix nahi aaya.....');
      throw 'Sorry Yarr... queue_topic_suffix nahi aaya.....';
    }

    const txCronProcessResp = await new TxCronProcessDetailsModel()
      .insert({
        chain_id: oThis.chainId,
        queue_topic_suffix: oThis.options.queue_topic_suffix
      })
      .fire();

    let cronProcess = await oThis._createCronProcess();
    await new TxCronProcessDetailsModel()
      .update(['cron_process_id = ?', cronProcess.insertId])
      .where(['id = ?', txCronProcessResp.insertId])
      .fire();

    return txCronProcessResp;
  }

  /**
   * Create Cron process
   *
   * @returns {Promise}
   * @private
   */
  async _createCronProcess() {
    const oThis = this;

    let cronInsertParams = {
      kind: oThis.kind,
      ip_address: oThis.ipAddress,
      chain_id: oThis.chainId,
      params: oThis.cronParams,
      status: oThis.status
    };
    if (oThis.tableAutoIncrementId) {
      cronInsertParams.id = oThis.tableAutoIncrementId;
    }

    return new CronProcessModel().insert(cronInsertParams).fire();
  }
}

module.exports = AddCronProcess;
