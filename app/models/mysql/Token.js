'use strict';
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
  statuses = {
    '1': tokenConstants.notDeployed,
    '2': tokenConstants.deploymentStarted,
    '3': tokenConstants.deploymentCompleted,
    '4': tokenConstants.deploymentFailed
  },
  invertedStatuses = util.invert(statuses);

/**
 * Class for token model
 *
 * @class
 */
class Token extends ModelBase {
  /**
   * Constructor for token model
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

  async getDetailsByTokenId(tokenId) {
    const oThis = this;

    let dbRows = await oThis
      .select('client_id')
      .where({
        id: tokenId
      })
      .fire();

    if (dbRows.length === 0) {
      return responseHelper.successWithData({});
    }

    return responseHelper.successWithData({
      clientId: dbRows[0].client_id
    });
  }

  async getDetailsByClientId(clientId) {
    const oThis = this;

    let dbRows = await oThis
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
   *
   * @param dbRow
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
      delayed_recovery_interval: dbRow.delayed_recovery_interval,
      createdAt: dbRow.created_at,
      updatedTimestamp: basicHelper.dateToSecondsTimestamp(dbRow.updated_at)
    };
  }

  /***
   * Flush cache
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
