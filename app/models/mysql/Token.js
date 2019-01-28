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

    let dbRow = dbRows[0];

    return responseHelper.successWithData({
      id: dbRow.id,
      clientId: dbRow.client_id,
      name: dbRow.name,
      symbol: dbRow.symbol,
      conversionFactor: dbRow.conversion_factor,
      decimal: dbRow.decimal,
      status: dbRow.status,
      createdAt: dbRow.created_at
    });
  }

  /***
   * Flush cache
   *
   * @param tokenId
   *
   * @returns {Promise<*>}
   */
  static flushCache(clientId) {
    const TokenCache = require(rootPrefix + '/lib/kitSaasSharedCacheManagement/Token');

    return new TokenCache({
      clientId: clientId
    }).clear();
  }
}

module.exports = Token;
