'use strict';

/**
 * Grant ETH to Partner companies in Sandbox ENV
 *
 * @module lib/fund/eth/GrantEth
 */
const Bignumber = require('bignumber.js');

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  FundEthBase = require(rootPrefix + '/lib/fund/eth/Base'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  grantConstants = require(rootPrefix + '/lib/globalConstant/grant'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

/**
 * Class for granting eth.
 *
 * @class
 */
class GrantEth extends FundEthBase {
  /**
   * Constructor for granting eth.
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;
    oThis.clientId = params.clientId;
    oThis.toAddress = params.toAddress;
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
          internal_error_identifier: 'l_f_e_ge_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: ''
        })
      );
    }

    let grantEthValueBn = new Bignumber(grantConstants.grantEthValueInWei),
      granterAddress = await oThis._fetchGranterAddress();

    let granterBalance = (await oThis._fetchBalances([granterAddress]))[granterAddress],
      granterBalanceBn = new Bignumber(granterBalance);

    if (granterBalanceBn.lte(grantEthValueBn)) {
      logger.info('Granter does not have enough balance');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_ge_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: ''
        })
      );
    }

    let granteeBalance = (await oThis._fetchBalances([oThis.toAddress]))[oThis.toAddress],
      granteeBalanceBn = new Bignumber(granteeBalance);

    if (granteeBalanceBn.gte(new Bignumber(grantEthValueBn))) {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      });
    }

    let fundAddressResponse = await oThis._fundAddressWithEth(
      granterAddress,
      oThis.toAddress,
      grantEthValueBn.toString(10),
      { pendingTransactionExtraData: oThis.pendingTransactionExtraData }
    );

    let isTaskPending = fundAddressResponse.isSuccess() && fundAddressResponse.data.transactionHash;

    if (!isTaskPending) {
      return fundAddressResponse;
    }

    return responseHelper.successWithData({
      transactionHash: fundAddressResponse.data.transactionHash,
      taskStatus: workflowStepConstants.taskPending,
      taskResponseData: oThis.txOptions
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
          internal_error_identifier: 'l_f_e_ge_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return chainAddressesRsp.data[chainAddressConstants.originGranterKind].address;
  }
}

module.exports = GrantEth;
