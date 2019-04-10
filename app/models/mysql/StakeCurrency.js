/**
 * Model for stake currencies table.
 *
 * @module app/models/mysql/StakeCurrency
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for stake currencies model.
 *
 * @class StakeCurrency
 */
class StakeCurrency extends ModelBase {
  /**
   * Constructor for stake currencies model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'stake_currencies';
  }

  /**
   * Format Db data.
   *
   * @param {object} dbRow
   * @param {number} dbRow.id
   * @param {string} dbRow.name
   * @param {string} dbRow.symbol
   * @param {number} dbRow.decimal
   * @param {string} dbRow.contract_address
   * @param {string} dbRow.created_at
   * @param {string} dbRow.updated_at
   *
   * @return {object}
   * @private
   */
  static _formatDbData(dbRow) {
    return {
      id: dbRow.id,
      name: dbRow.name,
      symbol: dbRow.symbol,
      decimal: dbRow.decimal,
      contractAddress: dbRow.contract_address,
      createdAt: dbRow.created_at,
      updatedTimestamp: dbRow.updated_at
    };
  }

  /**
   * Fetch stake currency details by contract address.
   *
   * @param {string} contractAddress
   *
   * @return {Promise<any>}
   */
  async fetchStakeCurrencyByContractAddress(contractAddress) {
    const oThis = this;

    const dbRow = await oThis
      .select('*')
      .where({ contract_address: contractAddress })
      .fire();

    if (dbRow.length === 0) {
      return responseHelper.successWithData({});
    }

    return responseHelper.successWithData(StakeCurrency._formatDbData(dbRow[0]));
  }

  /**
   * Fetch stake currency details by stakeCurrencyId.
   *
   * @param {string/number} stakeCurrencyId
   *
   * @return {Promise<any>}
   */
  async fetchStakeCurrencyById(stakeCurrencyId) {
    const oThis = this;

    const dbRow = await oThis
      .select('*')
      .where({ id: stakeCurrencyId })
      .fire();

    if (dbRow.length === 0) {
      return responseHelper.successWithData({});
    }

    return responseHelper.successWithData(StakeCurrency._formatDbData(dbRow[0]));
  }
}

module.exports = StakeCurrency;
