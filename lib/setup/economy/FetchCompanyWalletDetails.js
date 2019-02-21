'use strict';
/**
 * This class file helps in fetching company wallet details from proxy factory contract.
 *
 * @module lib/setup/economy/FetchCompanyWalletDetails
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

require(rootPrefix + '/lib/transactions/GetTxEvent');

const proxyFactoryContractName = 'ProxyFactory',
  proxyCreatedEventName = 'ProxyCreated';

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

    oThis.companyProxyCreatedEventDetails = {};
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

    await oThis._getRegisteredUserDetails();

    return responseHelper.successWithData(oThis.companyProxyCreatedEventDetails);
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
        contractNames: [proxyFactoryContractName],
        eventNamesMap: { [proxyCreatedEventName]: '1' }
      },
      GetTxEvent = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'GetTxEvent'),
      getTxEventObj = new GetTxEvent(getTxEventParams),
      getTxEventResponse = await getTxEventObj.perform();

    if (getTxEventResponse.isFailure()) {
      return Promise.reject(getTxEventResponse);
    }

    const proxyCreatedEvents = getTxEventResponse.data[proxyCreatedEventName];

    for (let index = 0; index < proxyCreatedEvents.length; index++) {
      let eventData = proxyCreatedEvents[index];
      logger.debug('eventData----------', eventData);

      if (eventData.name === '_proxy') {
        oThis.companyProxyCreatedEventDetails['tokenHolderAddress'] = eventData.value;
        oThis.companyProxyCreatedEventDetails['transactionHash'] = oThis.transactionHash;
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
}

InstanceComposer.registerAsShadowableClass(
  FetchCompanyWalletDetails,
  coreConstants.icNameSpace,
  'FetchCompanyWalletDetails'
);

module.exports = {};
