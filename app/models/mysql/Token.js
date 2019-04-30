/**
 * This is model for Token table.
 *
 * @module app/models/mysql/Token
 */

const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  tokenConstants = require(rootPrefix + '/lib/globalConstant/token');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment,
  statuses = tokenConstants.statuses,
  invertedStatuses = util.invert(statuses);

/**
 * Class for token model
 *
 * @class Token
 */
class Token extends ModelBase {
  /**
   * Constructor for token model
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'tokens';
  }

  get statuses() {
    return statuses;
  }

  get invertedStatuses() {
    return invertedStatuses;
  }

  /**
   * Get token details by tokenId.
   *
   * @param {number/string} tokenId
   *
   * @return {Promise<*|result>}
   */
  async getDetailsByTokenId(tokenId) {
    const oThis = this;

    const dbRows = await oThis
      .select('*')
      .where({
        id: tokenId
      })
      .fire();

    if (dbRows.length === 0) {
      return responseHelper.successWithData({});
    }

    return responseHelper.successWithData(oThis.formatDbData(dbRows[0]));
  }

  /**
   * Get token details by clientId.
   *
   * @param {number/string} clientId
   *
   * @return {Promise<*|result>}
   */
  async getDetailsByClientId(clientId) {
    const oThis = this;

    const dbRows = await oThis
      .select('*')
      .where({
        client_id: clientId
      })
      .fire();

    if (dbRows.length === 0) {
      return responseHelper.successWithData({});
    }

    return responseHelper.successWithData(oThis.formatDbData(dbRows[0]));
  }

  /**
   * Format Db data.
   *
   * @param {object} dbRow
   *
   * @return {object}
   */
  formatDbData(dbRow) {
    return {
      id: dbRow.id,
      clientId: dbRow.client_id,
      name: dbRow.name,
      symbol: dbRow.symbol,
      conversionFactor: dbRow.conversion_factor,
      decimal: dbRow.decimal,
      status: dbRow.status,
      delayedRecoveryInterval: dbRow.delayed_recovery_interval,
      stakeCurrencyId: dbRow.stake_currency_id,
      properties: dbRow.properties
        ? util.getStringsForWhichBitsAreSet(dbRow.properties, tokenConstants.invertedPropertiesConfig)
        : [],
      createdAt: dbRow.created_at,
      updatedTimestamp: basicHelper.dateToSecondsTimestamp(dbRow.updated_at)
    };
  }

  /**
   * Flush cache.
   *
   * @param {object} params
   *
   * @returns {Promise<*>}
   */
  static async flushCache(params) {
    const TokenByClientIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token');

    await new TokenByClientIdCache({
      clientId: params.clientId
    }).clear();

    const TokenByTokenIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenByTokenId');

    await new TokenByTokenIdCache({
      tokenId: params.tokenId
    }).clear();
  }
}

module.exports = Token;
