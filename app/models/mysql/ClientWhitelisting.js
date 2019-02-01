'use strict';
/**
 * Model to get client whitelisting details.
 *
 * @module aapp/models/mysql/ClientWhitelisting
 */
const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for workflow model.
 *
 * @class
 */
class ClientWhitelisting extends ModelBase {
  /**
   * Constructor
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });
    const oThis = this;
    oThis.tableName = 'client_whitelistings';
  }

  /**
   *
   * @param clientId
   * @return {Promise<*|result>}
   */
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
      id: dbRow.id
    });
  }

  /***
   * Flush cache
   *
   * @param clientId
   *
   * @returns {Promise<*>}
   */
  static flushCache(clientId) {
    const ClientWhitelistingCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ClientWhitelisting');
    return new ClientWhitelistingCache({
      clientId: clientId
    }).clear();
  }
}

module.exports = ClientWhitelisting;
