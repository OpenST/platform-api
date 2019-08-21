/**
 * Model for latest transactions table.
 *
 * @module app/models/mysql/LatestTransaction
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  stakeCurrencyConstants = require(rootPrefix + '/lib/globalConstant/stakeCurrency'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for latest transactions model.
 *
 * @class LatestTransactions
 */
class LatestTransaction extends ModelBase {
  /**
   * Constructor for latest transactions model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'latest_transactions';
  }

  /**
   * Format Db data.
   *
   * @param {object} dbRow
   * @param {number} dbRow.id
   * @param {string} dbRow.transaction_hash
   * @param {number} dbRow.chain_id
   * @param {number} dbRow.token_id
   * @param {string} dbRow.tx_fees_in_wei
   * @param {string} dbRow.token_amount_in_wei
   * @param {string} dbRow.created_ts
   * @param {string} dbRow.created_at
   * @param {string} dbRow.updated_at
   *
   * @return {object}
   * @private
   */
  static _formatDbData(dbRow) {
    return {
      id: dbRow.id,
      transactionHash: dbRow.transaction_hash,
      chainId: dbRow.chain_id,
      tokenId: dbRow.token_id,
      txFeesInWei: dbRow.tx_fees_in_wei,
      createdTs: dbRow.created_ts,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at
    };
  }

  /**
   * Flush cache
   *
   */
  static flushCache() {
    const LatestTransactionCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/LatestTransactions');

    new LatestTransactionCache({}).clear();
  }
}

module.exports = LatestTransaction;
