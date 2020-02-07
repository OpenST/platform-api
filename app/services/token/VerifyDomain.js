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
   * @param params.token_id {number} - token id of the client
   * @param params.domain {string} - domain to be verified
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.token_id;
    oThis.domain = params.domain;
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

    for (let ind = 0; ind < domainData.length; ind++) {
      const row = domainData[ind];
      if (row.domain === oThis.domain) {
        return responseHelper.successWithData({ valid: true });
      }
    }

    return responseHelper.successWithData({ valid: false });
  }
}

module.exports = VerifyDomain;
