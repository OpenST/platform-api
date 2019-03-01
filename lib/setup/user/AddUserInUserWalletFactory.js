'use strict';
/**
 * Add user address and session addresses in userWalletFactory of Token.
 *
 * @module lib/setup/user/AddUserInUserWalletFactory
 */
const OpenSTJs = require('@openstfoundation/openst.js');

const rootPrefix = '../../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress');

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
   * @param {Array} params.sessionAddresses: sessionAddresses which has to be added in wallet factory.
   * @param {String} params.sessionSpendingLimit: sessionSpendingLimit
   * @param {String} params.sessionExpiration: sessionExpiration
   * @param {String} params.recoveryOwnerAddress: recoveryOwnerAddress
   * @param {Integer} params.delayedRecoveryInterval: delayedRecoveryInterval
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.tokenId = params.tokenId;
    oThis.userId = params.userId;
    oThis.deviceAddress = params.deviceAddress;
    oThis.sessionAddresses = params.sessionAddresses;
    oThis.sessionSpendingLimit = params.sessionSpendingLimit;
    oThis.sessionExpiration = params.sessionExpiration;
    oThis.recoveryOwnerAddress = params.recoveryOwnerAddress;
    oThis.delayedRecoveryInterval = params.delayedRecoveryInterval;

    oThis.auxWeb3 = null;
    oThis.openSTUserHelper = null;
    oThis.tokenAddresses = null;
    oThis.blockGenerationTime = null;
    oThis.recoveryControllerAddress = null;
    oThis.recoveryBlockDelay = null;
  }

  /**
   * Performer
   *
   * @param {String} pendingTransactionExtraData: extraData for pending transaction.
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

    oThis._setRecoveryBlockDelay();

    oThis._initializeOpenSTObject();

    const response = await oThis._performAddUser();

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
   * Set Aux Web3 Instance.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _setAuxWeb3Instance() {
    const oThis = this;

    const response = await chainConfigProvider.getFor([oThis.auxChainId]),
      auxChainConfig = response[oThis.auxChainId];

    oThis.blockGenerationTime = auxChainConfig.auxGeth.blockGenerationTime;

    let auxWsProviders = auxChainConfig.auxGeth.readWrite.wsProviders;

    let shuffledProviders = basicHelper.shuffleArray(auxWsProviders);

    oThis.auxWeb3 = web3Provider.getInstance(shuffledProviders[0]).web3WsProvider;
  }

  /**
   * Initialize OpenST Object with addresses
   *
   * @return {Promise<void>}
   *
   * @private
   */
  _initializeOpenSTObject() {
    const oThis = this;

    const gnosisSafeMasterCopy = oThis.tokenAddresses[tokenAddressConstants.gnosisSafeMultiSigMasterCopyContractKind],
      tokenHolderMasterCopy = oThis.tokenAddresses[tokenAddressConstants.tokenHolderMasterCopyContractKind],
      delayedRecoveryModuleMasterCopy =
        oThis.tokenAddresses[tokenAddressConstants.delayedRecoveryModuleMasterCopyContractKind],
      createAndAddModules = oThis.tokenAddresses[tokenAddressConstants.createAndAddModulesContractKind],
      eip20Token = oThis.tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract],
      tokenRules = oThis.tokenAddresses[tokenAddressConstants.tokenRulesContractKind],
      userWalletFactoryAddress = oThis.tokenAddresses[tokenAddressConstants.userWalletFactoryContractKind],
      proxyFactory = oThis.tokenAddresses[tokenAddressConstants.proxyFactoryContractKind];

    oThis.recoveryControllerAddress = oThis.tokenAddresses[tokenAddressConstants.recoveryControllerAddressKind];

    oThis.openSTUserHelper = new OpenSTJs.Helpers.User(
      tokenHolderMasterCopy,
      gnosisSafeMasterCopy,
      delayedRecoveryModuleMasterCopy,
      createAndAddModules,
      eip20Token,
      tokenRules,
      userWalletFactoryAddress,
      proxyFactory,
      oThis.auxWeb3
    );
  }

  /**
   * Fetch Token Addresses
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchTokenAddresses() {
    const oThis = this;

    const tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.tokenAddresses = addressesResp.data;
  }

  /**
   * Set recovery block delay.
   *
   * @private
   */
  _setRecoveryBlockDelay() {
    const oThis = this;

    oThis.recoveryBlockDelay = Math.floor(Number(oThis.delayedRecoveryInterval) / oThis.blockGenerationTime);
  }

  /**
   * Perform Add User
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _performAddUser() {
    const oThis = this,
      sessionAddressesLength = oThis.sessionAddresses.length,
      sessionSpendingLimits = Array(sessionAddressesLength).fill(oThis.sessionSpendingLimit),
      sessionExpirations = Array(sessionAddressesLength).fill(oThis.sessionExpiration);

    const txObject = await oThis.openSTUserHelper._createUserWalletRawTx(
        [oThis.deviceAddress],
        1,
        oThis.recoveryOwnerAddress,
        oThis.recoveryControllerAddress,
        oThis.recoveryBlockDelay,
        oThis.sessionAddresses,
        sessionSpendingLimits,
        sessionExpirations
      ),
      data = txObject.encodeABI();

    // From and To Address of Transaction
    const fromAddress = oThis.tokenAddresses[tokenAddressConstants.tokenUserOpsWorkerKind],
      toAddress = oThis.tokenAddresses[tokenAddressConstants.userWalletFactoryContractKind];

    const txOptions = {
      gasPrice: contractConstants.auxChainGasPrice,
      gas: contractConstants.addUserInUserWalletGas, // Mandatory to pass this value.
      value: '0x0',
      from: fromAddress,
      to: toAddress,
      data: data
    };

    const submitTransactionObj = new SubmitTransaction({
      chainId: oThis.auxChainId,
      txOptions: txOptions,
      web3Instance: oThis.auxWeb3,
      options: oThis.pendingTransactionExtraData
    });

    return submitTransactionObj.perform();
  }
}

module.exports = AddUserInUserWalletFactory;
