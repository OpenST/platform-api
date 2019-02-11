'use strict';
/**
 * This class file helps in fetching company wallet details from proxy factory contract.
 *
 * @module lib/setup/economy/FetchCompanyWalletDetails
 */

const OpenStJs = require('@openstfoundation/openst.js'),
  abiDecoder = require('abi-decoder');

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

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
    oThis.auxWsProviders = null;
    oThis.auxWeb3 = null;
    oThis.companyProxyCreatedEventDetails = null;
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

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskDone,
      taskResponseData: oThis.companyProxyCreatedEventDetails
    });
  }

  /**
   * Set aux web3 instance.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _setAuxWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.auxChainId]),
      auxChainConfig = response[oThis.auxChainId],
      auxWsProviders = auxChainConfig.auxGeth.readWrite.wsProviders;

    oThis.auxWeb3 = web3Provider.getInstance(auxWsProviders[0]).web3WsProvider;
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

module.exports = FetchCompanyWalletDetails;
