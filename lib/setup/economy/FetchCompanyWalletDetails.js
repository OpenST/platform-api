'use strict';
/**
 * This class file helps in fetching company wallet details from proxy factory contract.
 *
 * @module lib/setup/economy/FetchCompanyWalletDetails
 */

const OSTBase = require('@openstfoundation/openst-base'),
  OpenStJs = require('@openstfoundation/openst.js'),
  abiDecoder = require('abi-decoder');

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  InstanceComposer = OSTBase.InstanceComposer;

const proxyFactoryContractName = 'ProxyFactory';

/**
 * Class for fetching company wallet details.
 *
 * @class
 */
class FetchCompanyWalletDetails {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {String} params.transactionHash
   * @param {Number} params.auxChainId
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.transactionHash = params.transactionHash;
    oThis.auxChainId = params.auxChainId;

    oThis.transactionReceipt = null;
    oThis.auxWeb3 = null;
    oThis.companyProxyCreatedEventDetails = null;
    oThis.configStrategyObj = null;
  }

  /***
   * Async perform
   *
   * @private
   * @return {Promise<result>}
   */
  async perform() {
    const oThis = this;

    await oThis._setAuxWeb3Instance();

    await oThis._fetchTransactionReceipt();

    await oThis._getRegisteredUserDetails();

    return responseHelper.successWithData(oThis.companyProxyCreatedEventDetails);
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

  /**
   * Set aux web3 instance.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _setAuxWeb3Instance() {
    const oThis = this,
      chainEndpoint = oThis._configStrategyObject.chainRpcProvider(oThis.auxChainId, 'readWrite');

    oThis.auxWeb3 = web3Provider.getInstance(chainEndpoint).web3WsProvider;
  }

  /**
   * Fetch transaction receipt.
   *
   * @return {Promise<any>}
   *
   * @private
   */
  async _fetchTransactionReceipt() {
    const oThis = this;

    oThis.transactionReceipt = await oThis.auxWeb3.eth.getTransactionReceipt(oThis.transactionHash);

    if (basicHelper.isEmptyObject(oThis.transactionReceipt)) {
      logger.error('Unable to fetch transaction receipt from chain.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_fcwd_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Get registered user details.
   *
   * @return {Promise<any>}
   *
   * @private
   */
  _getRegisteredUserDetails() {
    const oThis = this;

    oThis._addABI(proxyFactoryContractName);

    let decodedEvents = abiDecoder.decodeLogs(oThis.transactionReceipt.logs);

    for (let index = 0; index < decodedEvents.length; index++) {
      let event = decodedEvents[index];
      if (event !== undefined && event instanceof Object) {
        if (event.name === 'ProxyCreated') {
          oThis.companyProxyCreatedEventDetails = {
            transactionHash: oThis.transactionHash
          };
          for (let i = 0; i < event.events.length; i++) {
            let eventData = event.events[i];
            logger.debug(eventData);
            if (eventData.name == '_proxy') {
              oThis.companyProxyCreatedEventDetails.tokenHolderAddress = eventData.value;
            }
          }
        }
      }
    }

    if (basicHelper.isEmptyObject(oThis.companyProxyCreatedEventDetails)) {
      logger.error('No event found for Proxy Created.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_fcwd_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
  }

  /**
   * This function fetches abi of contract.
   *
   * @private
   */
  _addABI(contractName) {
    const oThis = this;

    let abi = new OpenStJs.AbiBinProvider().getABI(contractName);

    // Initialize decoder with abi.
    abiDecoder.addABI(abi);
  }
}

InstanceComposer.registerAsShadowableClass(
  FetchCompanyWalletDetails,
  coreConstants.icNameSpace,
  'FetchCompanyWalletDetails'
);

module.exports = {};
