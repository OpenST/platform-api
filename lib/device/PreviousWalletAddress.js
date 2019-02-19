'use strict';
/**
 * This class file helps in fetching the previous wallet address of the given address.
 *
 * @module lib/device/PreviousWalletAddress
 */

const OpenStJs = require('@openstfoundation/openst.js'),
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  GnosisSafeHelper = OpenStJs.Helpers.GnosisSafe;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

class PreviousWalletAddress {
  constructor(params) {
    const oThis = this;

    oThis.currentOwnerAddress = params.currentOwnerAddress;
    oThis.multiSigProxyAddress = params.multiSigProxyAddress;
  }

  /**
   * Perform
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this;

    oThis._sanitizeParams();

    return oThis._fetchPreviousAddress();
  }

  _sanitizeParams() {
    const oThis = this;

    oThis.multiSigProxyAddress = oThis.multiSigProxyAddress.toLowerCase();
    oThis.currentOwnerAddress = oThis.currentOwnerAddress.toLowerCase();
  }

  /**
   * Fetches previous owner address
   *
   * @returns {Promise<*|result>}
   * @private
   */
  async _fetchPreviousAddress() {
    const oThis = this;

    let gnosisSafeHelperObj = new GnosisSafeHelper(oThis.multiSigProxyAddress.toLowerCase(), oThis._web3Instance),
      allOwnersArray = await gnosisSafeHelperObj.getOwners(),
      sanitizedAllOwnersArray = oThis._sanitizeAllOwners(allOwnersArray),
      previousOwner = gnosisSafeHelperObj.findPreviousOwner(sanitizedAllOwnersArray, oThis.currentOwnerAddress);

    return responseHelper.successWithData({ previousOwner: previousOwner, currentOwner: oThis.currentOwnerAddress });
  }

  /**
   *
   * @param {Array}allOwnersArray
   * @returns {*}
   * @private
   */
  _sanitizeAllOwners(allOwnersArray) {
    const oThis = this;

    for (let i = 0; i < allOwnersArray.length; i++) {
      allOwnersArray[i] = allOwnersArray[i].toLowerCase();
    }

    return allOwnersArray;
  }

  /**
   * Get web3instance to interact with chain
   *
   * @return {Object}
   */
  get _web3Instance() {
    const oThis = this;

    if (oThis.web3InstanceObj) return oThis.web3InstanceObj;

    oThis.web3InstanceObj = web3Provider.getInstance(
      oThis._configStrategyObject.auxChainWsProvider(configStrategyConstants.gethReadWrite)
    ).web3WsProvider;

    return oThis.web3InstanceObj;
  }

  /***
   * Config strategy
   *
   * @return {Object}
   */
  get _configStrategy() {
    const oThis = this;
    return oThis.ic().configStrategy;
  }

  /**
   * Object of config strategy class
   *
   * @return {Object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }
}

InstanceComposer.registerAsShadowableClass(PreviousWalletAddress, coreConstants.icNameSpace, 'PreviousWalletAddress');
