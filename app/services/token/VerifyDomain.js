'use strict';

/**
 * This service verifies the token domain for browser sdk
 *
 * @module app/services/token/VerifyDomain
 */

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  ValidDomainByTokenIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/ValidDomainByTokenId'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class to verify token domain
 *
 * @class
 */
class VerifyDomain extends ServiceBase {
  /**
   * Constructor for VerifyDomain
   *
   * @param params
   * @param params.tokenId {number} - token id of the client
   * @param params.domain {string} - domain to be verified
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Async perform
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    return oThis._verifyDomainForToken();
  }

  /**
   * Verify domain for token
   *
   * @returns {Promise<void>}
   * @private
   */
  async _verifyDomainForToken() {
    const oThis = this;

    const response = await new ValidDomainByTokenIdCache({ tokenIds: [oThis.tokenId] }).fetch();

    const domainData = response.data[oThis.tokenId];

    for (const row in domainData) {
      if (row.domain === oThis.domain) {
        return responseHelper.successWithData({ valid: true });
      }
    }

    return responseHelper.successWithData({ valid: false });
  }
}

module.exports = VerifyDomain;
