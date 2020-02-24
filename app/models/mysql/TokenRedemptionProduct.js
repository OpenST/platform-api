const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  urlHelper = require(rootPrefix + '/lib/redemption/UrlHelper'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  tokenRedemptionProductsConstants = require(rootPrefix + '/lib/globalConstant/tokenRedemptionProducts');

// Declare variables.
const dbName = 'kit_saas_redemption_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for token redemption product model.
 *
 * @class TokenRedemptionProduct
 */
class TokenRedemptionProduct extends ModelBase {
  /**
   * Constructor for token redemption product model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'token_redemption_products';
  }

  /**
   * Format Db data.
   *
   * @param {object} dbRow
   * @param {number} dbRow.id
   * @param {number} dbRow.token_id
   * @param {number} dbRow.redemption_product_id
   * @param {string} dbRow.name
   * @param {string} dbRow.description
   * @param {string} dbRow.image
   * @param {number} dbRow.sequence_number
   * @param {string} dbRow.status
   * @param {string} dbRow.created_at
   * @param {string} dbRow.updated_at
   *
   * @returns {object}
   * @private
   */
  static _formatDbData(dbRow) {
    return {
      id: dbRow.id,
      tokenId: dbRow.token_id,
      redemptionProductId: dbRow.redemption_product_id,
      name: dbRow.name || null,
      description: dbRow.description || null,
      images: JSON.parse(dbRow.image) || null,
      sequenceNumber: dbRow.sequence_number,
      status: tokenRedemptionProductsConstants.statuses[dbRow.status],
      createdAt: dbRow.created_at,
      updatedTimestamp: basicHelper.dateToSecondsTimestamp(dbRow.updated_at)
    };
  }

  /**
   * Insert record.
   *
   * @param {object} params
   * @param {number} params.tokenId
   * @param {number} params.redemptionProductId
   * @param {string} [params.name]
   * @param {string} [params.description]
   * @param {string} [params.image]
   * @param {number} [params.sequenceNumber]
   * @param {string} params.status
   *
   * @returns {Promise<*|result>}
   */
  async insertRecord(params) {
    const oThis = this;

    const insertResponse = await oThis
      .insert({
        token_id: params.tokenId,
        redemption_product_id: params.redemptionProductId,
        name: params.name || null,
        description: params.description || null,
        image: params.image || null,
        sequence_number: params.sequenceNumber,
        status: tokenRedemptionProductsConstants.invertedStatuses[params.status]
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
  async fetchTokenRedemptionProductsByIds(ids) {
    const oThis = this,
      tokenRedemptionProductIds = [],
      response = {};

    const dbRows = await oThis
      .select('*')
      .where([' id IN (?)', ids])
      .fire();

    for (let index = 0; index < dbRows.length; index++) {
      response[dbRows[index].id] = TokenRedemptionProduct._formatDbData(dbRows[index]);
      tokenRedemptionProductIds.push(dbRows[index].id);

      if (response[dbRows[index].id].images) {
        response[dbRows[index].id].images = urlHelper.createLongResolutions(response[dbRows[index].id].images);
      }
    }

    return responseHelper.successWithData({
      redemptionProductIds: tokenRedemptionProductIds,
      redemptionProductMap: response
    });
  }

  /**
   * Fetch redemption product ids by token id.
   *
   * @param {number} tokenId
   *
   * @returns {Promise<*|result>}
   */
  async fetchProductIdsByTokenId(tokenId) {
    const oThis = this;

    const productIds = [];

    const dbRows = await oThis
      .select('id')
      .where(['token_id = ?', tokenId])
      .fire();

    for (let index = 0; index < dbRows.length; index++) {
      productIds.push(dbRows[index].id);
    }

    return responseHelper.successWithData({ tokenId: tokenId, redemptionProductIds: productIds });
  }

  /**
   * Flush cache.
   *
   * @param {object} params
   *
   * @returns {Promise<void>}
   */
  static async flushCache(params) {
    const promisesArray = [];

    // TODO: Add clear cache here.
    await Promise.all(promisesArray);
  }
}

module.exports = TokenRedemptionProduct;
