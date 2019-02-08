'use strict';

/**
 *  Fetch session details by userId and addresses.
 *
 * @module app/services/session/list/ByAddress
 */
const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  CommonValidator = require(rootPrefix + '/lib/validators/Common'),
  SessionListBase = require(rootPrefix + '/app/services/session/list/Base');

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

/**
 * Class to get session details by userId and addresses.
 *
 * @class SessionListByAddress
 */
class SessionListByAddress extends SessionListBase {
  /**
   * @param params
   * @param {Integer} params.client_id
   * @param {String} params.user_id - uuid
   * @param {String} params.address - comma separated list of session addresses
   * @param {Integer} [params.token_id]
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.sessionAddresses = basicHelper.commaSeperatedStrToArray(params.address);
  }

  /**
   * Validate and sanitize input parameters.
   *
   * @returns {*}
   * @private
   */
  _sanitizeParams() {
    const oThis = this,
      addresses = oThis.sessionAddresses;

    super._sanitizeParams();

    for (let index = 0; index < addresses.length; index++) {
      if (!CommonValidator.validateEthAddress(addresses[index])) {
        return Promise.reject(
          responseHelper.paramValidationError({
            internal_error_identifier: 'a_s_s_l_ba_1',
            api_error_identifier: 'invalid_api_params',
            params_error_identifiers: ['invalid_address'],
            debug_options: { address: addresses[index] }
          })
        );
      } else {
        oThis.addresses.push(addresses[index].toLowerCase());
      }
    }
  }

  _setAddresses() {
    //DO nothing as already came in params
  }
}

InstanceComposer.registerAsShadowableClass(SessionListByAddress, coreConstants.icNameSpace, 'SessionListByAddress');

module.exports = {};
