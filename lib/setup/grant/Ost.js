'use strict';
/**
 * Grant OST to Partner companies in Sandbox ENV
 *
 * @module lib/setup/grant/Ost
 */
const Bignumber = require('bignumber.js');

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  grantEthOstConstant = require(rootPrefix + '/lib/globalConstant/grant'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  GetOstBalance = require(rootPrefix + '/lib/getBalance/Ost'),
  TransferOst = require(rootPrefix + '/lib/fund/ost/Transfer');

/**
 * Class to grant OST to Partner companies in Sandbox ENV
 *
 * @class
 */
class GrantOst {
  /**
   * Constructor for granting ost.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;
    oThis.clientId = params.clientId;
    oThis.toAddress = params.toAddress;
    oThis.originChainId = params.originChainId;
  }

  /**
   * Async perform
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async perform() {
    const oThis = this;

    return oThis._performTransfers();
  }

  /**
   * perform transfers
   *
   * @return {Promise<*>}
   * @private
   */
  async _performTransfers() {
    const oThis = this;

    if (basicHelper.isMainSubEnvironment()) {
      logger.info('Grants are not allowed in main sub env');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_g_o_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: ''
        })
      );
    }

    let granterAddress = await oThis._fetchGranterAddress(),
      grantOstValueBn = new Bignumber(grantEthOstConstant.grantOstValueInWei);

    let ostBalances = await new GetOstBalance({
      originChainId: oThis.originChainId,
      addresses: [granterAddress, oThis.toAddress]
    }).perform();

    let granterBalance = ostBalances[granterAddress],
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

    let granteeBalance = ostBalances[oThis.toAddress],
      granteeBalanceBn = new Bignumber(granteeBalance);

    if (granteeBalanceBn.gte(new Bignumber(grantOstValueBn))) {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      });
    }

    let fundAddressResponse = await new TransferOst({
      toAddress: oThis.toAddress,
      fromAddress: granterAddress,
      amountInWei: grantEthOstConstant.grantOstValueInWei,
      waitTillReceipt: 0,
      pendingTransactionExtraData: oThis.pendingTransactionExtraData,
      originChainId: oThis.originChainId
    }).perform();

    let isTaskPending = fundAddressResponse.isSuccess() && fundAddressResponse.data.transactionHash;

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
   * Fetch granter address
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchGranterAddress() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
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
}

module.exports = GrantOst;
