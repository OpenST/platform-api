'use strict';

/*
  * Validate signature of Api request
  *
  * * Author: Puneet
  * * Date: 21/02/2019
  * * Reviewed by:
*/

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature');

require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');

class ByPersonalSign {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Object} params.inputParams - Params sent in API call (query params or form POST params)
   * @param {Object} params.urlParams - Params which we extracted from URL
   * @param {String} params.requestPath - path of the url called
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.inputParams = params.inputParams;
    oThis.urlParams = params.urlParams;
    oThis.reqPath = params.requestPath;

    oThis.currentTimestamp = null;
  }

  /**
   * Validate presence of Mandatory params
   *
   * @return {Promise}
   */
  async _validateParams() {
    const oThis = this,
      paramErrors = [];

    await super._validateParams();

    if (!CommonValidators.validatePersonalSign(oThis.inputParams['signature'])) {
      paramErrors.push('invalid_api_signature');
    }

    if (!CommonValidators.validateInteger(oThis.urlParams['token_id'])) {
      paramErrors.push('invalid_token_id');
    }

    if (!CommonValidators.validateUuidV4(oThis.urlParams['user_id'])) {
      paramErrors.push('invalid_user_id');
    }

    if (!CommonValidators.validatePersonalSign(oThis.inputParams['signature'])) {
      paramErrors.push('invalid_api_signature');
    }

    if (!CommonValidators.validateEthAddress(oThis.inputParams['wallet_address'])) {
      paramErrors.push('invalid_wallet_address');
    }

    if (!CommonValidators.validateEthAddress(oThis.inputParams['personal_sign_address'])) {
      paramErrors.push('invalid_personal_sign_address');
    }

    if (paramErrors.length > 0) {
      return oThis._validationError(paramErrors);
    }

    let cacheClass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache');
    new cacheClass({
      userId: params.userId,
      walletAddresses: [params.walletAddress]
    }).clear();

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   *
   * Validate Signature
   *
   * @return {Promise<*>}
   */
  async _validateSignature() {
    const oThis = this;

    const signature = oThis.inputParams['signature'];

    // oThis._stringToSign

    // if (computedSignature !== signature) {
    //   return oThis._validationError(['invalid_api_signature']);
    // }

    return Promise.resolve(responseHelper.successWithData());
  }

  get _signatureKind() {
    return apiSignature.personalSignKind;
  }
}

module.exports = ByPersonalSign;
