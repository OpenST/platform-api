'use strict';
/**
 * This module grants eth to economy owner.
 *
 * @module lib/fund/eth/GrantEth
 */
const rootPrefix = '../../..',
  GrantEthBase = require(rootPrefix + '/lib/fund/eth/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  grantConstants = require(rootPrefix + '/lib/globalConstant/grant'),
  environmentConst = require(rootPrefix + '/lib/globalConstant/environmentInfo'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

/**
 * Class for granting eth.
 *
 * @class
 */
class GrantEth extends GrantEthBase {
  /**
   * Constructor for granting eth.
   *
   * @param {Object} params
   * @param {Integer} params.clientId
   * @param {String} params.address
   *
   * @augments GrantEthBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.pendingTransactionExtraData = params['pendingTransactionExtraData'];
    oThis.clientId = params.clientId;
    oThis.ownerAddress = params.address;
  }

  /**
   * Async perform
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    oThis._validate();

    oThis._initializeVars();

    await oThis._setWeb3Instance();

    await oThis._fetchFromAddress();

    let response = await oThis._fetchBalancesAndFund();

    if (response.isSuccess() && response.data.transactionHash) {
      return Promise.resolve(
        responseHelper.successWithData({
          transactionHash: response.data.transactionHash,
          taskStatus: workflowStepConstants.taskPending,
          taskResponseData: response.data.txOptions
        })
      );
    } else {
      return response;
    }
  }

  /**
   * Check environment and subEnvironment.
   *
   * @return {*}
   *
   * @private
   */
  _validate() {
    if (
      !(coreConstants.environment === environmentConst.environment.production) &&
      !(coreConstants.subEnvironment === environmentConst.subEnvironment.mainnet)
    )
      logger.info('Non production sandbox environment.');
    else {
      return responseHelper.error({
        internal_error_identifier: 'l_f_e_ge_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: ''
      });
    }
  }

  /**
   * Fetch granter address
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchFromAddress() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_ge_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.fromAddress = chainAddressesRsp.data[chainAddressConstants.originGranterKind].address;
  }

  /**
   * Fund address
   *
   * @param address
   * @param amount
   * @return {Promise<void>}
   * @private
   */
  async fundAddress(address, amount) {
    const oThis = this;

    let txOptions = {
      from: oThis.fromAddress,
      to: address,
      value: amount,
      gas: oThis.gas,
      gasPrice: oThis.gasPrice
    };

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.originChainId,
      provider: oThis.originWsProviders[0],
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform();

    logger.info('===Submitted transaction', submitTxRsp.data['transactionHash'], 'for address', txOptions.to);
    submitTxRsp.data.txOptions = txOptions;

    return submitTxRsp;
  }

  /**
   * Fetch balances and fund the address.
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _fetchBalancesAndFund() {
    const oThis = this,
      granterBalance = await oThis.originWeb3.eth.getBalance(oThis.fromAddress);

    if (granterBalance >= grantConstants.grantEthValue) {
      let granteeBalance = await oThis.originWeb3.eth.getBalance(oThis.ownerAddress);

      if (granteeBalance >= grantConstants.grantEthValue) {
        return Promise.resolve(
          responseHelper.successWithData({
            taskStatus: workflowStepConstants.taskDone
          })
        );
      } else {
        return oThis.fundAddress(oThis.ownerAddress, grantConstants.grantEthValue);
      }
    } else {
      logger.info('Granter does not have enough balance');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_ge_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: ''
        })
      );
    }
  }
}

module.exports = GrantEth;
