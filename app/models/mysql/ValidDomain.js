const url = require('url');

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for valid domain model.
 *
 * @class ValidDomain
 */
class ValidDomain extends ModelBase {
  /**
   * Constructor for valid domain model.
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
      const parsedDomain = url.parse(validDomainObj.domain.toLowerCase());
      const hostname = parsedDomain.hostname;
      const protocol = parsedDomain.protocol.split(':')[0];

      responseData[validDomainObj.token_id][hostname] = {
        id: validDomainObj.id,
        tokenId: validDomainObj.token_id,
        hostname: hostname,
        protocol: protocol
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
