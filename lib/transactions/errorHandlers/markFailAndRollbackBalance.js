'use strict';
/**
 * Mark fail and revert pessimistic balance.
 * This class the array of Tx Meta rows as input.
 *
 * @module lib/transactionErrorHandlers/queuedHandler
 */

const BigNumber = require('bignumber.js');
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/custom_console_logger');

class MarkFailAndRollbackBalanceKlass {
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.lockId = params.lockId;
    oThis.transactionsMetaRecords = params.transactionsMetaRecords;

    oThis.transactionUuidsToBeFailed = [];
    oThis.pendingTransactionsMap = {};
    oThis.failMarkedTransactionUuids = [];
    oThis.tokenIds = [];
    oThis.tokenIdToConfigObjectMap = {};
    oThis.txUuidToTxMetaMap = {};
  }

  /**
   * Perform
   *
   * @returns {Promise}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      logger.error('lib/transactionErrorHandlers/markFailAndRollbackBalance::perform::catch');
      logger.error(error);
    });
  }

  /**
   *
   * @returns {Promise<*>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis.validate();

    await oThis.setConfigStrategies();

    await oThis.setPendingTxForFailedUuids();

    await oThis.markPendingTransactionFail();

    await oThis.releaseLockAndMarkTransactionMetaFail();

    await oThis._rollBackPessimisticDebit();

    return true;
  }
}

module.exports = MarkFailAndRollbackBalanceKlass;
