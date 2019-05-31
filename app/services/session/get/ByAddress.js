/**
 * Module to fetch session details of specific session address.
 *
 * @module app/services/session/get/ByAddress
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  GetSessionBase = require(rootPrefix + '/app/services/session/get/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

/**
 * Class to get session details of specific session address.
 *
 * @class GetSessionByAddress
 */
class GetSessionByAddress extends GetSessionBase {
  /**
   * Constructor to get session details of specific session address.
   *
   * @param {object} params
   * @param {string} params.user_id
   * @param {integer} params.client_id
   * @param {integer} [params.token_id]
   * @param {string} params.session_address: session address.
   *
   * @augments GetSessionBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.address = params.session_address;
  }

  /**
   * Validate and sanitize input parameters.
   *
   * @sets oThis.address
   *
   * @returns {Promise<void>}
   * @private
   */
  async _validateAndSanitizeParams() {
    const oThis = this;

    oThis.address = basicHelper.sanitizeAddress(oThis.address);
  }

  /**
   * Set addresses
   *
   * @sets oThis.sessionAddresses
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setSessionAddresses() {
    const oThis = this;

    oThis.sessionAddresses = [oThis.address];
  }

  /**
   * Format API response.
   *
   * @return {*}
   * @private
   */
  _formatApiResponse() {
    const oThis = this;

    const session = oThis.sessionDetails[0];

    if (!CommonValidators.validateObject(session)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_s_g_ba_1',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['session_not_found'],
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({
      [resultType.session]: session
    });
  }
}

InstanceComposer.registerAsShadowableClass(GetSessionByAddress, coreConstants.icNameSpace, 'GetSessionByAddress');

module.exports = {};
