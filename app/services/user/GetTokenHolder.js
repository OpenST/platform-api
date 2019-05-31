/**
 * Module to get token holder.
 *
 * @module app/services/user/GetTokenHolder
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  GetUserBase = require(rootPrefix + '/app/services/user/get/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

/**
 * Class to get token holder.
 *
 * @class GetTokenHolder
 */
class GetTokenHolder extends GetUserBase {
  /**
   * Constructor to get token holder.
   *
   * @param {object} params
   * @param {number} params.client_id: client Id
   * @param {number} [params.token_id]: token Id
   * @param {array} [params.ids]: filter by user uuids.
   * @param {array} [params.limit]: limit
   * @param {string} [params.pagination_identifier]: pagination identifier to fetch page
   * @param {string} params.user_id
   *
   * @augments GetUserBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userId = params.user_id;
  }

  /**
   * Validate and sanitize params.
   *
   * @sets oThis.userId
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateAndSanitizeParams() {
    const oThis = this;

    oThis.userId = basicHelper.sanitizeuuid(oThis.userId);
  }

  /**
   * Set user ids.
   *
   * @sets oThis.userIds
   *
   * @return {Promise<void>}
   * @private
   */
  async _setUserIds() {
    const oThis = this;

    oThis.userIds = [oThis.userId];
  }

  /**
   * Format API response.
   *
   * @return {Promise<*>}
   * @private
   */
  async _formatApiResponse() {
    const oThis = this;

    const user = oThis.userDetails[0];

    if (!CommonValidators.validateObject(user)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_gth_1',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['user_not_found'],
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({
      [resultType.tokenHolder]: user
    });
  }
}

InstanceComposer.registerAsShadowableClass(GetTokenHolder, coreConstants.icNameSpace, 'GetTokenHolder');

module.exports = {};
