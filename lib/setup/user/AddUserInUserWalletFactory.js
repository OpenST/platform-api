'use strict';
/**
 * Add user address and session addresses in userWalletFactory of Token.
 *
 * @module lib/setup/user/AddUserInUserWalletFactory
 */

const rootPrefix = '../../..',
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain');

const OpenStJs = require('@openstfoundation/openst.js');

/**
 * Class for adding user in UserWalletFactory of Token
 *
 * @class
 */
class AddUserInUserWalletFactory {
  /**
   * Constructor for adding user in UserWalletFactory
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

    oThis.auxWeb3 = null;
    oThis.openStUserHelper = null;
    oThis.tokenAddresses = null;
    oThis.auxWsProviders = null;
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

    await oThis._setAuxWeb3Instance();

    await oThis._fetchTokenAddresses();

    oThis._initializeOpenStObject();

    let response = await oThis._performAddUSer();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          transactionHash: response.data.transactionHash,
          taskResponseData: { chainId: oThis.auxChainId, transactionHash: response.data.transactionHash }
        })
      );
    } else {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed,
          taskResponseData: JSON.stringify(response)
        })
      );
    }
  }

  /**
   * _setAuxWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setAuxWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.auxChainId]);

    let auxChainConfig = response[oThis.auxChainId];

    oThis.auxWsProviders = auxChainConfig.auxGeth.readWrite.wsProviders;

    oThis.auxWeb3 = web3Provider.getInstance(oThis.auxWsProviders[0]).web3WsProvider;
  }

  /**
   * Initialize OpenSt Object with addresses
   *
   * @return {Promise<void>}
   * @private
   */
  _initializeOpenStObject() {
    const oThis = this;

    let gnosisSafeMasterCopy = oThis.tokenAddresses[tokenAddressConstants.gnosisSafeMultiSigMasterCopyContract],
      tokenHolderMasterCopy = oThis.tokenAddresses[tokenAddressConstants.tokenHolderMasterCopyContract],
      eip20Token = oThis.tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract],
      tokenRules = oThis.tokenAddresses[tokenAddressConstants.tokenRulesContract],
      userWalletFactoryAddress = oThis.tokenAddresses[tokenAddressConstants.userWalletFactoryContract];

    oThis.openStUserHelper = new OpenStJs.Helpers.User(
      gnosisSafeMasterCopy,
      tokenHolderMasterCopy,
      eip20Token,
      tokenRules,
      userWalletFactoryAddress,
      oThis.auxWeb3
    );
  }

  /**
   * Fetch Token Addresses
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchTokenAddresses() {
    const oThis = this;

    let tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.tokenAddresses = addressesResp.data;
  }

  /**
   * Perform Add User
   *
   * @return {Promise<void>}
   * @private
   */
  async _performAddUSer() {
    const oThis = this;

    let txObject = await oThis.openStUserHelper._createUserWalletRawTx(
        [oThis.deviceAddress],
        1,
        contractConstants.nullAddress,
        contractConstants.zeroBytesData,
        [oThis.sessionAddress],
        [oThis.sessionSpendingLimit],
        [oThis.sessionExpiration]
      ),
      data = txObject.encodeABI();

    // From and To Address of Transaction
    let from = oThis.tokenAddresses[tokenAddressConstants.auxWorkerAddressKind][0],
      to = oThis.tokenAddresses[tokenAddressConstants.userWalletFactoryContract];

    let txOptions = {
      gasPrice: contractConstants.auxChainGasPrice,
      gas: contractConstants.addUserInUserWalletGas, // Mandatory to pass this value.
      value: '0x0',
      from: from,
      to: to,
      data: data
    };

    let submitTransactionObj = new SubmitTransaction({
      chainId: oThis.auxChainId,
      txOptions: txOptions,
      provider: oThis.auxWsProviders[0],
      options: oThis.pendingTransactionExtraData
    });

    return submitTransactionObj.perform();
  }
}

module.exports = AddUserInUserWalletFactory;
