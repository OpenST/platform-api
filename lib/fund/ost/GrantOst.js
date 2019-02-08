'use strict';
/**
 * Grant OST to Partner companies in Sandbox ENV
 *
 * @module lib/fund/ost/GrantOst
 */
const Bignumber = require('bignumber.js');

const rootPrefix = '../../..',
  FundOstBase = require(rootPrefix + '/lib/fund/ost/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  grantEthOstConstant = require(rootPrefix + '/lib/globalConstant/grant'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  GetOstBalance = require(rootPrefix + '/lib/getBalance/Ost');

/**
 * Class to grant OST to Partner companies in Sandbox ENV
 *
 * @class
 */
class GrantOst extends FundOstBase {
  /**
   * Constructor for granting ost.
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
          internal_error_identifier: 'l_f_e_go_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: ''
        })
      );
    }

    let granterAddress = oThis.originChainAddresses[chainAddressConstants.originGranterKind].address,
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
          internal_error_identifier: 'l_f_o_go_2',
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

    let fundAddressResponse = await oThis._fundAddressWithOst(
      granterAddress,
      oThis.toAddress,
      grantEthOstConstant.grantOstValueInWei,
      { pendingTransactionExtraData: oThis.pendingTransactionExtraData }
    );

    let isTaskPending = fundAddressResponse.isSuccess() && fundAddressResponse.data.transactionHash;

    if (!isTaskPending) {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      });
    }

    return responseHelper.successWithData({
      transactionHash: fundAddressResponse.data.transactionHash,
      taskStatus: workflowStepConstants.taskPending,
      taskResponseData: oThis.txOptions
    });
  }
}

module.exports = GrantOst;
