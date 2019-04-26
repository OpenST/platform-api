/**
 * Module to grant ETH to partner companies in Sandbox ENV.
 *
 * @module lib/setup/grant/Eth
 */

const Bignumber = require('bignumber.js');

const rootPrefix = '../../..',
  GetEthBalance = require(rootPrefix + '/lib/getBalance/Eth'),
  TransferEth = require(rootPrefix + '/lib/fund/eth/Transfer'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  grantConstants = require(rootPrefix + '/lib/globalConstant/grant'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to grant ETH to partner companies in Sandbox ENV.
 *
 * @class GrantEth
 */
class GrantEth {
  /**
   * Constructor to grant ETH to partner companies in Sandbox ENV.
   *
   * @param {object} params
   * @param {string/number} params.tokenId
   * @param {object} params.pendingTransactionExtraData
   * @param {string} params.toAddress
   * @param {string/number} params.originChainId
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;
    oThis.toAddress = params.toAddress;
    oThis.originChainId = params.originChainId;
  }

  /**
   * Async perform.
   *
   * @return {Promise<void>}
   * @private
   */
  async perform() {
    const oThis = this;

    return oThis._performTransfers();
  }

  /**
   * Perform transfers.
   *
   * @return {Promise<*>}
   * @private
   */
  async _performTransfers() {
    const oThis = this;

    if (basicHelper.isMainSubEnvironment()) {
      logger.error('Grants are not allowed in main sub env.');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_g_e_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: ''
        })
      );
    }

    const grantEthValueBn = new Bignumber(grantConstants.grantEthValueInWei),
      granterAddress = await oThis._fetchGranterAddress();

    const granterBalance = (await oThis._fetchBalances([granterAddress]))[granterAddress],
      granterBalanceBn = new Bignumber(granterBalance);

    if (granterBalanceBn.lte(grantEthValueBn)) {
      logger.info('Granter does not have enough balance.');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_g_e_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: ''
        })
      );
    }

    const granteeBalance = (await oThis._fetchBalances([oThis.toAddress]))[oThis.toAddress],
      granteeBalanceBn = new Bignumber(granteeBalance);

    if (granteeBalanceBn.gte(new Bignumber(grantEthValueBn))) {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      });
    }

    const fundAddressResponse = await new TransferEth({
      tokenId: oThis.tokenId,
      pendingTransactionKind: pendingTransactionConstants.grantEthKind,
      toAddress: oThis.toAddress,
      fromAddress: granterAddress,
      amountInWei: grantEthValueBn.toString(10),
      waitTillReceipt: 0,
      pendingTransactionExtraData: oThis.pendingTransactionExtraData,
      originChainId: oThis.originChainId
    }).perform();

    const isTaskPending = fundAddressResponse.isSuccess() && fundAddressResponse.data.transactionHash;

    if (!isTaskPending) {
      return fundAddressResponse;
    }

    return responseHelper.successWithData({
      transactionHash: fundAddressResponse.data.transactionHash,
      taskStatus: workflowStepConstants.taskPending,
      debugParams: fundAddressResponse.data.txOptions
    });
  }

  /**
   * Fetch granter address.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGranterAddress() {
    // Fetch all addresses associated with origin chain id.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_g_e_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return chainAddressesRsp.data[chainAddressConstants.originGranterKind].address;
  }

  /**
   * Fetch ETH balances for all the addresses.
   *
   * @return {Promise<Object>}: Address to balance map.
   * @private
   */
  _fetchBalances(addresses) {
    const oThis = this;

    // Fetch eth balances
    const getEthBalance = new GetEthBalance({
      originChainId: oThis.originChainId,
      addresses: addresses
    });

    return getEthBalance.perform();
  }
}

module.exports = GrantEth;
