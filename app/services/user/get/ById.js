'use strict';

const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../../../..',
  GetUserBase = require(rootPrefix + '/app/services/user/get/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

const InstanceComposer = OSTBase.InstanceComposer;

class GetUser extends GetUserBase {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userId = params.user_id;
  }

  /**
   * validate and sanitize params
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateAndSanitizeParams() {
    const oThis = this;
    oThis.userId = basicHelper.sanitizeuuid(oThis.userId);
  }

  /**
   * set user ids
   *
   * @return {Promise<void>}
   * @private
   */
  async _setUserIds() {
    const oThis = this;

    oThis.userIds = [oThis.userId];
  }

  /**
   * format api response
   *
   * @return {Promise<*>}
   * @private
   */
  async _formatApiResponse() {
    const oThis = this;

    let user = oThis.userDetails[0];

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
