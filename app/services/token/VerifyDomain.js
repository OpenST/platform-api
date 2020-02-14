'use strict';

/**
 * This service verifies the token domain for browser sdk
 *
 * @module app/services/token/VerifyDomain
 */

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  ValidDomainByTokenIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/ValidDomainByTokenId'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.general);

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

    if (domainData[oThis.domain.toLowerCase()]) {
      return responseHelper.successWithData({});
    }

    return Promise.reject(
      responseHelper.error({
        internal_error_identifier: 'a_s_t_vd_1',
        api_error_identifier: 'invalid_domain_name',
        debug_options: {},
        error_config: errorConfig
      })
    );
  }
}

module.exports = VerifyDomain;
