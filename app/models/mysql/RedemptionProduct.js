/**
 * Module for redemption products model.
 *
 * @module app/models/mysql/RedemptionProduct
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  redemptionProductConstants = require(rootPrefix + '/lib/globalConstant/redemptionProduct');

// Declare variables.
const dbName = 'saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

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
        denomination: JSON.stringify(params.denomination),
        expiry_in_days: params.expiry_in_days,
        status: redemptionProductConstants.invertedStatuses[params.status]
      })
      .fire();

    return responseHelper.successWithData(insertResponse.insertId);
  }

  /**
   * Flush cache.
   *
   * @returns {Promise<void>}
   */
  static async flushCache(params) {}
}

module.exports = RedemptionProduct;
