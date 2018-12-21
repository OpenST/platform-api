'use strict';

/**
 * setup simpleToken Base
 *
 * @module tools/chainSetup/origin/simpleToken/Base
 */
const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  NonceManager = require(rootPrefix + '/lib/nonce/Manager'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3');

/**
 *
 * @class
 */
class SetupSimpleTokenBase {
  /**
   * Constructor
   *
   * @param {Object} params
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.signerAddress = params['signerAddress'];
    oThis.signerKey = params['signerKey'];

    oThis.web3InstanceObj = null;
  }

  /**
   *
   * Perform
   *
   * @return {Promise<result>}
   *
   */
  perform() {
    const oThis = this;

    if (basicHelper.isProduction() && basicHelper.isMainSubEnvironment()) {
      return responseHelper.error({
        internal_error_identifier: 't_cs_o_st_b_2',
        api_error_identifier: 'action_prohibited_in_prod_main',
        debug_options: {}
      });
    }

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 't_cs_o_st_b_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  get configStrategy() {
    const oThis = this;
    return oThis.ic().configStrategy;
  }

  get web3Instance() {
    const oThis = this;
    if (oThis.web3InstanceObj) return oThis.web3InstanceObj;
    const chainEndpoint = oThis.configStrategy[configStrategyConstants.originGeth].readWrite.wsProvider;
    oThis.web3InstanceObj = web3Provider.getInstance(chainEndpoint).web3WsProvider;
    return oThis.web3InstanceObj;
  }

  get gasPrice() {
    //TODO: Add dynamic gas logic here
    return '0x3B9ACA00';
  }

  addKeyToWallet() {
    const oThis = this;
    oThis.web3Instance.eth.accounts.wallet.add(oThis.signerKey);
  }

  removeKeyFromWallet() {
    const oThis = this;
    oThis.web3Instance.eth.accounts.wallet.remove(oThis.signerKey);
  }

  /**
   * fetch nonce (calling this method means incrementing nonce in cache, use judiciouly)
   *
   * @ignore
   *
   * @param {string} address
   *
   * @return {Promise}
   */
  async fetchNonce(address) {
    const oThis = this,
      originGethConstants = oThis.configStrategy[configStrategyConstants.originGeth];

    return new NonceManager({
      address: address,
      chainId: originGethConstants.chainId
    }).getNonce();
  }
}

InstanceComposer.registerAsShadowableClass(SetupSimpleTokenBase, coreConstants.icNameSpace, 'SetupSimpleTokenBase');

module.exports = SetupSimpleTokenBase;
