'use strict';
/**
 *  Fetch session details of specific session address.
 *
 * @module app/services/session/get/ByAddress
 */

const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  GetSessionBase = require(rootPrefix + '/app/services/session/get/Base'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

const InstanceComposer = OSTBase.InstanceComposer;

/**
 * Class to get session details of specific session address
 *
 * @class GetSessionByAddress
 */
class GetSessionByAddress extends GetSessionBase {
  /**
   * @param {object} params
   * @param {String} params.address - Session address.
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.address = params.address;
  }

  /**
   * Validate and sanitize input parameters.
   *
   * @returns {*}
   *
   * @private
   */
  async _validateAndSanitizeParams() {
    const oThis = this;
    oThis.address = basicHelper.sanitizeAddress(oThis.address);
  }

  /**
   * Set addresses
   *
   * Sets oThis.sessionAddresses
   *
   * @private
   */
  async _setSessionAddresses() {
    const oThis = this;
    oThis.sessionAddresses = [oThis.address];
  }

  /**
   * Format API response
   *
   * @return {*}
   * @private
   */
  _formatApiResponse() {
    const oThis = this;

    let session = oThis.sessionDetails[0];

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
