'use strict';

/**
 *
 * @module lib/setup/economy/PostAddCompanyWallet
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/setup/economy/FetchCompanyWalletDetails');
require(rootPrefix + '/lib/setup/user/ActivateUser');
require(rootPrefix + '/lib/setup/user/RollbackUserActivation');

class PostAddCompanyWallet {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Integer} params.tokenId - id in tokens table
   * @param {Integer} params.auxChainId - chainId
   * @param {String} params.transactionHash - transactionHash
   * @param {String} params.tokenCompanyUserId: uuid of token's comapnay uuid
   * @param {Array} params.sessionKeys: session keys
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params['tokenId'];
    oThis.auxChainId = params['auxChainId'];
    oThis.transactionHash = params['transactionHash'];
    oThis.tokenCompanyUserId = params['tokenCompanyUserId'];
    oThis.sessionKeys = params['sessionKeys'];

    oThis.tokenCompanyTokenHolderAddress = null;
  }

  /**
   *  performer
   *
   * @returns {Promise<*>}
   */
  async perform() {
    const oThis = this;

    let response = await oThis._setContractAddress();

    let returnResponse;

    if (response.isFailure()) {
      returnResponse = await oThis._triggerFailureUpdate();
    } else {
      returnResponse = await oThis._triggerSuccessUpdate();
    }

    returnResponse.data.taskResponseData = returnResponse.data.taskResponseData || {};
    returnResponse.data.taskResponseData.tokenCompanyTokenHolderAddress = oThis.tokenCompanyTokenHolderAddress;

    return Promise.resolve(returnResponse);
  }

  /**
   *
   * @return {Promise<result>}
   * @private
   */
  async _setContractAddress() {
    const oThis = this,
      FetchCompanyWalletDetails = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'FetchCompanyWalletDetails'),
      helperObj = new FetchCompanyWalletDetails({
        transactionHash: oThis.transactionHash,
        auxChainId: oThis.auxChainId
      });

    let response = await helperObj.perform().catch(function(error) {
      logger.error(error);
      return responseHelper.error({
        internal_error_identifier: 'l_s_e_acw_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: { error: error.toString() }
      });
    });

    if (response.isFailure()) {
      return response;
    }

    oThis.tokenCompanyTokenHolderAddress = response.data.tokenHolderAddress;

    if (!oThis.tokenCompanyTokenHolderAddress) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_pacw_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { response: response.data }
        })
      );
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * on success of add company wallet trigger success updation
   * @private
   */
  async _triggerSuccessUpdate() {
    const oThis = this,
      ActivateUser = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ActivateUser');

    let tokenAddressesCacheRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    if (tokenAddressesCacheRsp.isFailure() || !tokenAddressesCacheRsp.data) {
      return Promise.reject(tokenAddressesCacheRsp);
    }

    let activateUser = new ActivateUser({
      auxChainId: oThis.auxChainId,
      tokenId: oThis.tokenId,
      userId: oThis.tokenCompanyUserId,
      sessionAddresses: oThis.sessionKeys,
      tokenHolderAddress: oThis.tokenCompanyTokenHolderAddress,
      multiSigAddress: tokenAddressesCacheRsp.data[tokenAddressConstants.ownerAddressKind]
    });

    return activateUser.perform();
  }

  /**
   * on failure of add company wallet trigger failure updation
   * @private
   */
  async _triggerFailureUpdate() {
    const oThis = this,
      RollbackUserActivation = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'RollbackUserActivation'),
      rollbackUserActivation = new RollbackUserActivation({
        auxChainId: oThis.auxChainId,
        tokenId: oThis.tokenId,
        userId: oThis.tokenCompanyUserId,
        sessionAddresses: oThis.sessionKeys
      });

    return rollbackUserActivation.perform();
  }
}

InstanceComposer.registerAsShadowableClass(PostAddCompanyWallet, coreConstants.icNameSpace, 'PostAddCompanyWallet');

module.exports = {};
