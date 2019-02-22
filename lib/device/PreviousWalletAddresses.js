'use strict';
/**
 * This class file helps in fetching the previous wallet address of the given address.
 *
 * @module lib/device/PreviousWalletAddresses
 */

const OpenStJs = require('@openstfoundation/openst.js'),
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  GnosisSafeHelper = OpenStJs.Helpers.GnosisSafe;

const rootPrefix = '..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

/**
 * Class for fetching previous wallet address.
 *
 * @class
 */
class PreviousWalletAddresses {
  /**
   * Constructor for fetching previous wallet address.
   *
   * @param {Object} params
   * @param {String} params.multiSigProxyAddress
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

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
  }

  /**
   * Fetches previous wallet address
   *
   * @returns {Promise<*|result>}
   *
   * @private
   */
  async _fetchPreviousAddress() {
    const oThis = this;

    const gnosisSafeHelperObj = new GnosisSafeHelper(oThis.multiSigProxyAddress.toLowerCase(), oThis._web3Instance),
      allOwnersArray = await gnosisSafeHelperObj.getOwners(),
      sanitizedOwners = oThis._sanitizeAllOwners(allOwnersArray);

    return responseHelper.successWithData(sanitizedOwners);
  }

  /**
   * Sanitize owners.
   *
   * @param {Array} allOwnersArray
   *
   * @returns {*}
   *
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

  /**
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

InstanceComposer.registerAsShadowableClass(
  PreviousWalletAddresses,
  coreConstants.icNameSpace,
  'PreviousWalletAddresses'
);
module.exports = PreviousWalletAddresses;
