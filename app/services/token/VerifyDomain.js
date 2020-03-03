const url = require('url');

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  ValidDomainByTokenIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/ValidDomainByTokenId'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.general);

/**
 * Class to verify token domain for browser sdk.
 *
 * @class VerifyDomain
 */
class VerifyDomain extends ServiceBase {
  /**
   * Constructor to verify token domain for browser sdk.
   *
   * @param {object} params
   * @param {number} params.token_id: token id of the client
   * @param params.domain: domain to be verified
   *
   * @constructor
   */
  constructor(params) {
    super();

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

    await oThis._validateAndSanitize();

    return oThis._verifyDomainForToken();
  }

  /**
   * Validate and sanitize.
   *
   * @sets oThis.domain
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    const parsedDomain = url.parse(oThis.domain);

    oThis.hostname = parsedDomain.hostname.toLowerCase();
    oThis.protocol = parsedDomain.protocol ? parsedDomain.protocol.split(':')[0] : '';

    console.log('==oThis.hostname=', oThis.hostname);
    console.log('==oThis.hostname=', oThis.protocol);

    const validProtocols = ['http', 'https'];
    if (validProtocols.indexOf(oThis.protocol) === -1) {
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
    console.log('=domainData===', domainData);
    const domainObject = domainData[oThis.hostname];
    console.log('==domainObject==', domainObject);

    if (CommonValidators.validateNonEmptyObject(domainObject)) {
      if (oThis.hostname === domainObject.hostname && oThis.protocol === domainObject.protocol) {
        return responseHelper.successWithData({});
      }

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_vd_2',
          api_error_identifier: 'invalid_domain_name',
          debug_options: {},
          error_config: errorConfig
        })
      );
    }

    return Promise.reject(
      responseHelper.error({
        internal_error_identifier: 'a_s_t_vd_3',
        api_error_identifier: 'invalid_domain_name',
        debug_options: {},
        error_config: errorConfig
      })
    );
  }
}

module.exports = VerifyDomain;
