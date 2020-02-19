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

    oThis.tableName = 'valid_domains';
  }

  /**
   * Get details by token ids.
   *
   * @param {array<number>} tokenIds
   *
   * @return {Promise<*|result>}
   */
  async getDetailsByTokenIds(tokenIds) {
    const oThis = this;

    const validDomainDetails = await oThis
      .select('*')
      .where({
        token_id: tokenIds
      })
      .fire();

    if (validDomainDetails.length === 0) {
      return responseHelper.successWithData({});
    }

    const responseData = {};

    for (let index = 0; index < validDomainDetails.length; index++) {
      const validDomainObj = validDomainDetails[index];
      responseData[validDomainObj.token_id] = responseData[validDomainObj.token_id] || {};
      responseData[validDomainObj.token_id][validDomainObj.domain.toLowerCase()] = {
        id: validDomainObj.id,
        tokenId: validDomainObj.token_id,
        domain: validDomainObj.domain
      };
    }

    return responseHelper.successWithData(responseData);
  }

  /**
   * Flush cache.
   *
   * @param {array<number>} tokenIds
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
