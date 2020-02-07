'use strict';
/**
 * Model to get valid domain details.
 *
 * @module aapp/models/mysql/ValidDomain
 */
const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for ValidDomain model.
 *
 * @class
 */
class ValidDomain extends ModelBase {
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
    oThis.tableName = 'valid_domain';
  }

  /**
   *  Get details by token ids.
   * @param tokenIds
   * @return {Promise<*|result>}
   */
  async getDetailsByTokenIds(tokenIds) {
    const oThis = this;

    const details = await oThis
      .select('*')
      .where({
        token_id: tokenIds
      })
      .fire();

    if (details.length === 0) {
      return responseHelper.successWithData({});
    }

    const responseData = {};

    for (let index = 0; index < details.length; index++) {
      const detail = details[index];
      responseData[detail.token_id] = responseData[detail.token_id] || [];
      responseData[detail.token_id].push({
        id: detail.id,
        tokenId: detail.token_id,
        domain: detail.domain
      });
    }

    return responseHelper.successWithData(responseData);
  }

  /**
   * Flush cache
   *
   * @param clientId
   *
   * @returns {Promise<*>}
   */
  static flushCache(tokenIds) {
    const ValidDomainByTokenIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/ValidDomainByTokenId');

    return new ValidDomainByTokenIdCache({
      tokenIds: tokenIds
    }).clear();
  }
}

module.exports = ValidDomain;
