/**
 * Module for redemption product model.
 *
 * @module app/models/mysql/RedemptionProduct
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  urlHelper = require(rootPrefix + '/lib/redemption/UrlHelper'),
  redemptionProductsConstants = require(rootPrefix + '/lib/globalConstant/redemptionProducts');

// Declare variables.
const dbName = 'kit_saas_redemption_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for redemption product model.
 *
 * @class RedemptionProduct
 */
class RedemptionProduct extends ModelBase {
  /**
   * Constructor for redemption product model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'redemption_products';
  }

  /**
   * Format Db data.
   *
   * @param {object} dbRow
   * @param {number} dbRow.id
   * @param {string} dbRow.name
   * @param {string} dbRow.description
   * @param {Object} dbRow.image
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
      description: dbRow.description,
      image: JSON.parse(dbRow.image) || null,
      status: redemptionProductsConstants.statuses[dbRow.status],
      createdAt: dbRow.created_at,
      updatedTimestamp: basicHelper.dateToSecondsTimestamp(dbRow.updated_at)
    };
  }

  /**
   * Insert record.
   *
   * @param params
   * @returns {Promise<*|result>}
   */
  async insertRecord(params) {
    const oThis = this;

    let insertResponse = await oThis
      .insert({
        name: params.name,
        description: params.description,
        image: params.image || null,
        status: redemptionProductsConstants.invertedStatuses[params.status]
      })
      .fire();

    return responseHelper.successWithData(insertResponse.insertId);
  }

  /**
   * Fetch redemption product details by ids.
   *
   * @param {array<string/number>} ids
   *
   * @return {Promise<any>}
   */
  async fetchRedemptionProductsByIds(ids) {
    const oThis = this,
      response = {};

    const dbRows = await oThis
      .select('*')
      .where(['id IN (?)', ids])
      .fire();

    for (let index = 0; index < dbRows.length; index++) {
      response[dbRows[index].id] = RedemptionProduct._formatDbData(dbRows[index]);

      if (response[dbRows[index].id].image) {
        response[dbRows[index].id].image = urlHelper.createLongResolutions(response[dbRows[index].id].image);
      }
    }

    return responseHelper.successWithData(response);
  }

  /**
   * Flush cache.
   *
   * @returns {Promise<void>}
   */
  static async flushCache(params) {
    const promisesArray = [];

    if (params.ids) {
      const RedemptionProductCache = require(rootPrefix + '/lib/cacheManagement/sharedMulti/RedemptionProduct');
      promisesArray.push(new RedemptionProductCache({ ids: [params.ids] }).clear());
    }

    await Promise.all(promisesArray);
  }
}

module.exports = RedemptionProduct;
