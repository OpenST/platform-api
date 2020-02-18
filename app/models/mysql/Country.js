/**
 * Module for country model.
 *
 * @module app/models/mysql/Country
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare variables.
const dbName = 'kit_saas_redemption_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for redemption product country model.
 *
 * @class RedemptionProductCountry
 */
class RedemptionProductCountry extends ModelBase {
  /**
   * Constructor for country model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'countries';
  }

  /**
   * Format Db data.
   *
   * @param {object} dbRow
   * @param {number} dbRow.id
   * @param {string} dbRow.name
   * @param {string} dbRow.country_iso_code
   * @param {string} dbRow.currency
   * @param {Object} dbRow.conversions
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
      countryIsoCode: dbRow.country_iso_code,
      currency: dbRow.currency,
      conversions: JSON.parse(dbRow.conversions),
      createdAt: dbRow.created_at,
      updatedTimestamp: basicHelper.dateToSecondsTimestamp(dbRow.updated_at)
    };
  }
}

module.exports = RedemptionProductCountry;
