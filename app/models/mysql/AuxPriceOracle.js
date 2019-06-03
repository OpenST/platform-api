/**
 * Model for aux price oracle.
 *
 * @module app/models/mysql/AuxPriceOracle
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  auxPriceOracleConstants = require(rootPrefix + '/lib/globalConstant/auxPriceOracle'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for aux price oracle model.
 *
 * @class AuxPriceOracle
 */
class AuxPriceOracle extends ModelBase {
  /**
   * Constructor for aux price oracle model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'aux_price_oracles';
  }

  /**
   * Format Db data.
   *
   * @param {object} dbRow
   * @param {number} dbRow.id
   * @param {string} dbRow.chain_id
   * @param {string} dbRow.stake_currency_id
   * @param {number} dbRow.quote_currency_id
   * @param {string} dbRow.contract_address
   * @param {string} dbRow.status
   * @param {string} dbRow.created_at
   * @param {string} dbRow.updated_at
   *
   * @return {object}
   * @private
   */
  static _formatDbData(dbRow) {
    return {
      id: dbRow.id,
      stake_currency_id: dbRow.stake_currency_id,
      quote_currency_id: dbRow.quote_currency_id,
      contractAddress: dbRow.contract_address,
      status: auxPriceOracleConstants.statuses[dbRow.status],
      createdAt: dbRow.created_at,
      updatedTimestamp: basicHelper.dateToSecondsTimestamp(dbRow.updated_at)
    };
  }

  /**
   * Fetch price oracle contract details
   *
   * @param {Object} params
   * @param {Number} params.chainId - chain id
   * @param {Number} params.stakeCurrencyId - stake currency id
   * @param {Number} params.quoteCurrencyId - quote currency id
   *
   * @return {Promise<any>}
   */
  async fetchPriceOracleDetails(params) {
    const oThis = this;

    const dbRow = await oThis
      .select('*')
      .where({
        chain_id: params.chainId,
        stake_currency_id: params.stakeCurrencyId,
        quote_currency_id: params.quoteCurrencyId,
        status: auxPriceOracleConstants.invertedStatuses[auxPriceOracleConstants.activeStatus]
      })
      .fire();

    if (dbRow.length === 0) {
      return Promise.reject(new Error('No entry found!'));
    }

    return responseHelper.successWithData(AuxPriceOracle._formatDbData(dbRow[0]));
  }
}

module.exports = AuxPriceOracle;
