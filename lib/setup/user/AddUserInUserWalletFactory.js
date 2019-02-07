'use strict';
/**
 * Add user address and session addresses in userWalletFactory of Token.
 *
 * @module lib/setup/user/AddUserInUserWalletFactory
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

const OpenStJs = require('@openstfoundation/openst.js');

/**
 * Class for adding user in UserWalletFactory of Token
 *
 * @class
 */
class AddUserInUserWalletFactory {
  /**
   * Constructor for Gnosis-Safe Multi-sig deployment
   *
   * @param {Object} params
   * @param {String} params.auxChainId: auxChainId for which token rules needs be deployed.
   * @param {String} params.tokenId: tokenId of which User Wallet Factory would be used.
   * @param {String} params.userId: userId which has to be added in wallet factory.
   * @param {String} params.deviceAddress: deviceAddress which has to be added in wallet factory.
   * @param {String} params.sessionAddress: sessionAddress which has to be added in wallet factory.
   * @param {String} params.sessionSpendingLimit: sessionSpendingLimit
   * @param {String} params.sessionExpiration: sessionExpiration
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.tokenId = params.tokenId;
    oThis.userId = params.userId;
    oThis.deviceAddress = params.deviceAddress;
    oThis.sessionAddress = params.sessionAddress;
    oThis.sessionSpendingLimit = params.sessionSpendingLimit;
    oThis.sessionExpiration = params.sessionExpiration;

    oThis.gasPrice = null;
    oThis.deployChainId = null;
    oThis.chainEndpoint = null;
    oThis.auxWeb3Instance = null;
    oThis.configStrategyObj = null;

    oThis.auxDeployerAddress = null;
  }

  /**
   * Performer
   *
   * * @param {String} pendingTransactionExtraData: extraData for pending transaction.
   *
   * @return {Promise<result>}
   */
  perform(pendingTransactionExtraData) {
    const oThis = this;
    oThis.pendingTransactionExtraData = pendingTransactionExtraData;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_s_u_auuw_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: { error: error.toString() }
        });
      }
    });
  }

  /**
   * Async performer
   *
   * @private
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;
  }
}

module.exports = AddUserInUserWalletFactory;
