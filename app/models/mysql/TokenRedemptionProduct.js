/**
 * Module for token redemption product model.
 *
 * @module app/models/mysql/TokenRedemptionProduct
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  tokenRedemptionProductsConstants = require(rootPrefix + '/lib/globalConstant/tokenRedemptionProducts');

// Declare variables.
const dbName = 'saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

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
   * @param {Object} dbRow.image
   * @param {number} dbRow.sequence_number
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
      tokenId: dbRow.token_id,
      redemptionProductId: dbRow.redemption_product_id,
      name: dbRow.name || null,
      description: dbRow.description || null,
      image: JSON.parse(dbRow.image) || null,
      sequenceNumber: dbRow.sequence_number,
      status: tokenRedemptionProductsConstants.statuses[dbRow.status],
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
      response = {};

    const dbRows = await oThis
      .select('*')
      .where([
        ' id IN (?) AND status = ?',
        ids,
        tokenRedemptionProductsConstants.invertedStatuses[tokenRedemptionProductsConstants.activeStatus]
      ])
      .fire();

    if (dbRows.length === 0) {
      return Promise.reject(new Error(`No entries found for ids: ${ids}.`));
    }

    for (let index = 0; index < dbRows.length; index++) {
      response[dbRows[index].id] = TokenRedemptionProduct._formatDbData(dbRows[index]);
    }

    return responseHelper.successWithData(response);
  }

  /**
   * Fetch redemption product ids by token id.
   *
   * @param tokenId
   * @returns {Promise<*|result>}
   */
  async fetchProductIdsByTokenId(tokenId) {
    const oThis = this,
      productIds = [];

    const dbRows = await oThis
      .select('id')
      .where([
        'token_id = ? AND status = ?',
        tokenId,
        tokenRedemptionProductsConstants.invertedStatuses[tokenRedemptionProductsConstants.activeStatus]
      ])
      .fire();

    if (dbRows.length === 0) {
      return Promise.reject(new Error(`No entries found for token id: ${tokenId}.`));
    }

    for (let index = 0; index < dbRows.length; index++) {
      productIds.push(dbRows[index].id);
    }

    return responseHelper.successWithData(productIds);
  }

  /**
   * Flush cache.
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
