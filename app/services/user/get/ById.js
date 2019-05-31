/**
 * Module to get user by id.
 *
 * @module app/services/user/get/ById
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  GetUserBase = require(rootPrefix + '/app/services/user/get/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

/**
 * Class to get user by id.
 *
 * @class GetUser
 */
class GetUser extends GetUserBase {
  /**
   * Constructor to get user by id.
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
          internal_error_identifier: 'a_s_u_g_bi_1',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['user_not_found'],
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({
      [resultType.user]: user
    });
  }
}

InstanceComposer.registerAsShadowableClass(GetUser, coreConstants.icNameSpace, 'GetUser');

module.exports = {};
