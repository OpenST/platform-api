'use strict';
/**
 * This class file helps in fetching registered user details from User wallet factory.
 *
 * @module lib/setup/user/FetchRegisteredUserDetails
 */

const OpenSTJs = require('@openstfoundation/openst.js'),
  abiDecoder = require('abi-decoder'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/transactions/GetTxEvent');

// Declare contract and event names.
const userWalletContractName = 'UserWalletFactory',
  gnosisSafeContractName = 'GnosisSafe',
  userWalletCreatedEventName = 'UserWalletCreated',
  enabledModuleEventName = 'EnabledModule';

/**
 * Class for fetching registered user details.
 *
 * @class
 */
class FetchRegisteredUserDetails {
  /**
   * Constructor for fetching registered user details.
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
    oThis.userRegisteredEventDetails = {};
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
      taskResponseData: oThis.userRegisteredEventDetails
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

    const response = await chainConfigProvider.getFor([oThis.auxChainId]),
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
          internal_error_identifier: 'l_su_u_frud_2',
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
  async _getRegisteredUserDetails() {
    const oThis = this;

    const getTxEventParams = {
        chainId: oThis.auxChainId,
        transactionHash: oThis.transactionHash,
        contractNames: [userWalletContractName, gnosisSafeContractName],
        eventNamesMap: { [userWalletCreatedEventName]: '1', [enabledModuleEventName]: '1' }
      },
      GetTxEvent = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'GetTxEvent'),
      getTxEventObj = new GetTxEvent(getTxEventParams),
      getTxEventResponse = await getTxEventObj.perform();

    if (getTxEventResponse.isFailure()) {
      return Promise.reject(getTxEventResponse);
    }

    // Fetch userWalletCreatedEvents.
    const userWalletCreatedEvents = getTxEventResponse.data[userWalletCreatedEventName];
    for (let index = 0; index < userWalletCreatedEvents.length; index++) {
      const eventData = userWalletCreatedEvents[index];
      logger.debug('eventData----------', eventData);

      oThis.userRegisteredEventDetails.transactionHash = oThis.transactionHash;

      if (eventData.name === '_gnosisSafeProxy') {
        oThis.userRegisteredEventDetails.multiSigAddress = eventData.value;
      }
      if (eventData.name === '_tokenHolderProxy') {
        oThis.userRegisteredEventDetails.tokenHolderAddress = eventData.value;
      }
    }

    // Fetch enabledModuleEvents.
    const enabledModuleEvents = getTxEventResponse.data[enabledModuleEventName];
    for (let index = 0; index < enabledModuleEvents.length; index++) {
      const eventData = enabledModuleEvents[index];
      logger.debug('eventData----------', eventData);

      if (eventData.name === 'module') {
        oThis.userRegisteredEventDetails.recoveryAddress = eventData.value;
      }
    }

    if (basicHelper.isEmptyObject(oThis.userRegisteredEventDetails)) {
      logger.error('No event found for UserWalletCreated and EnabledModule.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_su_u_frud_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
  }
}

InstanceComposer.registerAsShadowableClass(
  FetchRegisteredUserDetails,
  coreConstants.icNameSpace,
  'FetchRegisteredUserDetails'
);

module.exports = {};
