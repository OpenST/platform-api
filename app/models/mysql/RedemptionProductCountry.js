/**
 * Module for redemption product country model.
 *
 * @module app/models/mysql/RedemptionProductCountry
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
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
   * Constructor for redemption product country model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'redemption_product_countries';
  }

  /**
   * Format Db data.
   *
   * @param {object} dbRow
   * @param {number} dbRow.id
   * @param {number} dbRow.redemption_product_id
   * @param {number} dbRow.country_id
   * @param {Object} dbRow.redemption_options
   * @param {string} dbRow.created_at
   * @param {string} dbRow.updated_at
   *
   * @return {object}
   * @private
   */
  static _formatDbData(dbRow) {
    return {
      id: dbRow.id,
      redemptionProductId: dbRow.redemption_product_id,
      countryId: dbRow.country_id,
      redemptionOptions: JSON.parse(dbRow.redemption_options),
      createdAt: dbRow.created_at,
      updatedTimestamp: basicHelper.dateToSecondsTimestamp(dbRow.updated_at)
    };
  }

  /**
   * Fetch redemption product countries data for given productId and countryId.
   *
   * @param productId
   * @param countryId
   * @returns {Promise<void>}
   * @private
   */
  async fetchDetailsByProductIdAndCountryId(productId, countryId) {
    const oThis = this;

    let response = {};

    const dbRows = await oThis
      .select('*')
      .where({
        redemption_product_id: productId,
        country_id: countryId
      })
      .fire();

    if (dbRows.length > 0) {
      response = RedemptionProductCountry._formatDbData(dbRows[0]);
    }

    return responseHelper.successWithData(response);
  }

  /**
   * Fetch redemption product countries data for given productId and countryId.
   *
   * @param productIds
   * @returns {Promise<void>}
   * @private
   */
  async fetchDetailsByProductIds(productIds) {
    const oThis = this,
      redemptionProductCountryData = {};

    const redemptionProductCountriesData = await oThis
      .select('*')
      .where({ redemption_product_id: productIds })
      .fire();

    for (let i = 0; i < redemptionProductCountriesData.length; i++) {
      let formatedDbData = RedemptionProductCountry._formatDbData(redemptionProductCountriesData[i]);
      redemptionProductCountryData[formatedDbData.redemptionProductId] =
        redemptionProductCountryData[formatedDbData.redemptionProductId] || {};
      redemptionProductCountryData[formatedDbData.redemptionProductId][formatedDbData.countryId] = {
        redemptionOptions: formatedDbData.redemptionOptions
      };
    }

    return responseHelper.successWithData(redemptionProductCountryData);
  }
}

module.exports = RedemptionProductCountry;
