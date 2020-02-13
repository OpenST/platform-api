/**
 * Module for redemption products model.
 *
 * @module app/models/mysql/RedemptionProduct
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

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
   * Flush cache.
   *
   * @returns {Promise<void>}
   */
  static async flushCache(params) {}
}

module.exports = RedemptionProduct;
