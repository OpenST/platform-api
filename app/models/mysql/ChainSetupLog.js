'use strict';

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  chainSetupLogsConst = require(rootPrefix + '/lib/globalConstant/chainSetupLogs');

const dbName = 'saas_big_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class ChainSetupLogs extends ModelBase {
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'chain_setup_logs';
  }

  /**
   * parameters -
   *
   * @param {object} params - external passed parameters
   * @param {String} params.chainId - chainId
   * @param {String} params.chainKind - chainKind
   * @param {String} params.stepKind - stepKind
   * @param {String} params.debugParams - debugParams
   * @param {String} params.transactionHash - transactionHash
   * @param {String} params.status - status
   *
   * @return {Promise}
   */
  async insertRecord(params) {
    const oThis = this;

    let insertedRec = await new ChainSetupLogs()
      .insert({
        chain_id: params.chainId,
        chain_kind: chainSetupLogsConst.invertedChainKinds[params.chainKind],
        step_kind: chainSetupLogsConst.invertedStepKinds[params.stepKind],
        debug_params: JSON.stringify(params.debugParams),
        transaction_hash: params.transactionHash.toLowerCase(),
        status: chainSetupLogsConst.invertedStatus[params.status]
      })
      .fire();

    if (insertedRec.affectedRows === 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_m_es_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({ chainSetupLogId: insertedRec.id });
  }
}

module.exports = ChainSetupLogs;
