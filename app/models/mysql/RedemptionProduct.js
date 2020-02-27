const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  urlHelper = require(rootPrefix + '/lib/redemption/urlHelper'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  redemptionProductConstants = require(rootPrefix + '/lib/globalConstant/redemptionProduct');

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
   * @param {string} dbRow.image
   * @param {number} dbRow.status
   * @param {string} dbRow.created_at
   * @param {string} dbRow.updated_at
   *
   * @returns {object}
   * @private
   */
  static _formatDbData(dbRow) {
    return {
      id: dbRow.id,
      name: dbRow.name,
      description: dbRow.description,
      images: JSON.parse(dbRow.image) || null,
      createdAt: dbRow.created_at,
      status: dbRow.status,
      updatedTimestamp: basicHelper.dateToSecondsTimestamp(dbRow.updated_at)
    };
  }

  /**
   * Insert record.
   *
   * @param {object} params
   * @param {string} params.name
   * @param {string} params.description
   * @param {string} params.image
   * @param {string} params.status
   *
   * @returns {Promise<*|result>}
   */
  async insertRecord(params) {
    const oThis = this;

    const insertResponse = await oThis
      .insert({
        name: params.name,
        description: params.description,
        image: JSON.stringify(params.image) || null,
        status: redemptionProductConstants.invertedStatuses[params.status]
      })
      .fire();

    return responseHelper.successWithData(insertResponse.insertId);
  }

  /**
   * Fetch redemption product details by ids.
   *
   * @param {array<string/number>} ids
   *
   * @returns {Promise<any>}
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

      if (response[dbRows[index].id].images) {
        response[dbRows[index].id].images = urlHelper.createLongResolutions(response[dbRows[index].id].images);
      }
    }

    return responseHelper.successWithData(response);
  }

  /**
   * Flush cache.
   *
   * @param {object} params
   * @param {array<number>} params.ids
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
