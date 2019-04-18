/**
 * Module to grant OST to Partner companies in Sandbox ENV.
 *
 * @module lib/setup/grant/Ost
 */

const Bignumber = require('bignumber.js');

const rootPrefix = '../../..',
  GetErc20Balance = require(rootPrefix + '/lib/getBalance/Erc20'),
  TransferOst = require(rootPrefix + '/lib/fund/erc20/Transfer'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  grantEthOstConstant = require(rootPrefix + '/lib/globalConstant/grant'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  conversionRatesConstants = require(rootPrefix + '/lib/globalConstant/conversionRates'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to grant OST to Partner companies in Sandbox ENV.
 *
 * @class GrantOst
 */
class GrantOst {
  /**
   * Constructor to grant OST to Partner companies in Sandbox ENV.
   *
   * @param {object} params
   * @param {number} params.tokenId
   * @param {object} params.pendingTransactionExtraData
   * @param {number} params.clientId
   * @param {string} params.toAddress
   * @param {number} params.originChainId
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;
    oThis.clientId = params.clientId;
    oThis.toAddress = params.toAddress;
    oThis.originChainId = params.originChainId;
  }

  /**
   * Perform.
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
      logger.info('Grants are not allowed in main sub env.');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_g_o_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: ''
        })
      );
    }

    const granterAddress = await oThis._fetchGranterAddress(),
      grantOstValueBn = new Bignumber(grantEthOstConstant.grantOstValueInWei);

    const ostBalances = await oThis._fetchOstBalance([granterAddress, oThis.toAddress]);

    const granterBalance = ostBalances[granterAddress],
      granterBalanceBn = new Bignumber(granterBalance);

    if (granterBalanceBn.lte(grantOstValueBn)) {
      logger.info('Granter does not have enough balance');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_g_o_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: ''
        })
      );
    }

    const granteeBalance = ostBalances[oThis.toAddress],
      granteeBalanceBn = new Bignumber(granteeBalance);

    if (granteeBalanceBn.gte(new Bignumber(grantOstValueBn))) {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      });
    }

    const fundAddressResponse = await new TransferOst({
      tokenId: oThis.tokenId,
      pendingTransactionKind: pendingTransactionConstants.grantOstKind,
      toAddress: oThis.toAddress,
      fromAddress: granterAddress,
      amountInWei: grantEthOstConstant.grantOstValueInWei,
      waitTillReceipt: 0,
      tokenSymbol: conversionRatesConstants.OST,
      pendingTransactionExtraData: oThis.pendingTransactionExtraData,
      originChainId: oThis.originChainId
    }).perform();

    const isTaskPending = fundAddressResponse.isSuccess() && fundAddressResponse.data.transactionHash;

    if (!isTaskPending) {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      });
    }

    return responseHelper.successWithData({
      transactionHash: fundAddressResponse.data.transactionHash,
      taskStatus: workflowStepConstants.taskPending,
      debugParams: oThis.txOptions
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
          internal_error_identifier: 'l_s_g_o_4',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return chainAddressesRsp.data[chainAddressConstants.originGranterKind].address;
  }

  /**
   * Fetch Ost balance of addresses.
   *
   * @param {array} addresses
   *
   * @return {Promise<*>}
   * @private
   */
  async _fetchOstBalance(addresses) {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_g_o_5',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    const simpleTokenContractAddress = chainAddressesRsp.data[chainAddressConstants.stContractKind].address;

    return new GetErc20Balance({
      originChainId: oThis.originChainId,
      addresses: addresses,
      contractAddress: simpleTokenContractAddress
    }).perform();
  }
}

module.exports = GrantOst;
