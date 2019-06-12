/**
 * Model for quote currencies table.
 *
 * @module app/models/mysql/QuoteCurrency
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  quoteCurrencyConstants = require(rootPrefix + '/lib/globalConstant/quoteCurrency'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for quote currencies model.
 *
 * @class QuoteCurrency
 */
class QuoteCurrency extends ModelBase {
  /**
   * Constructor for quote currencies model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'quote_currencies';
  }

  /**
   * Format Db data.
   *
   * @param {object} dbRow
   * @param {number} dbRow.id
   * @param {string} dbRow.name
   * @param {string} dbRow.symbol
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
      name: dbRow.name,
      symbol: dbRow.symbol,
      status: quoteCurrencyConstants.statuses[dbRow.status],
      createdAt: dbRow.created_at,
      updatedTimestamp: basicHelper.dateToSecondsTimestamp(dbRow.updated_at)
    };
  }

  /**
   * Fetch quote currency details by quoteCurrencyIds.
   *
   * @param {array<string/number>} quoteCurrencyIds
   *
   * @return {Promise<any>}
   */
  async fetchQuoteCurrencyByIds(quoteCurrencyIds) {
    const oThis = this,
      response = {};

    const dbRows = await oThis
      .select('*')
      .where([
        ' id IN (?) AND status = ?',
        quoteCurrencyIds,
        quoteCurrencyConstants.invertedStatuses[quoteCurrencyConstants.activeStatus]
      ])
      .fire();

    if (dbRows.length === 0) {
      return Promise.reject(new Error(`No entries found for quoteCurrencyIds: ${quoteCurrencyIds}.`));
    }

    for (let index = 0; index < dbRows.length; index++) {
      response[dbRows[index].id] = QuoteCurrency._formatDbData(dbRows[index]);
    }

    return responseHelper.successWithData(response);
  }

  /**
   * Fetch stake currency details by quoteCurrencySymbols.
   *
   * @param {array<string>} quoteCurrencySymbols
   *
   * @return {Promise<*>}
   */
  async fetchQuoteCurrencyBySymbols(quoteCurrencySymbols) {
    const oThis = this,
      response = {};

    const dbRows = await oThis
      .select('*')
      .where([
        ' symbol IN (?) AND status = ?',
        quoteCurrencySymbols,
        quoteCurrencyConstants.invertedStatuses[quoteCurrencyConstants.activeStatus]
      ])
      .fire();

    if (dbRows.length === 0) {
      return Promise.reject(new Error(`No entries found for quoteCurrencySymbols: ${quoteCurrencySymbols}.`));
    }

    for (let index = 0; index < dbRows.length; index++) {
      response[dbRows[index].symbol] = QuoteCurrency._formatDbData(dbRows[index]);
    }

    return responseHelper.successWithData(response);
  }
}

module.exports = QuoteCurrency;
