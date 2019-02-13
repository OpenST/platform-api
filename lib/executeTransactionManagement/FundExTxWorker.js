'use strict';

/**
 *
 * This module fund execute transaction workers with stPrime.
 *
 * @module lib/executeTransactionManagement/FundExTxWorker
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  GetStPrimeBalance = require(rootPrefix + '/lib/getBalance/StPrime'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  TransferStPrimeBatch = require(rootPrefix + '/lib/fund/stPrime/BatchTransfer'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenExTxWorkerProcessesModel = require(rootPrefix + '/app/models/mysql/TokenExtxWorkerProcesses');

// Declare variables.
const minimumNoOfExecuteTransaction = basicHelper.convertToBigNumber(coreConstants.MINIMUM_NO_OF_EXECUTE_TRANSACTION),
  totalNoOfExecuteTransaction = basicHelper.convertToBigNumber(coreConstants.TOTAL_NO_OF_EXECUTE_TRANSACTION);

// Config for addresses which need to be funded.

// This value is for one execute transaction.
const fundingConfig = {
  [tokenAddressConstants.txWorkerAddressKind]: '0.0001'
};

/**
 * Class to execute transaction workers.
 *
 * @class FundExTxWorker
 */
class FundExTxWorker {
  /**
   * @constructor
   *
   * @param {Object} params
   * @param {Integer} params.tokenId
   * @param {Integer} params.chainId
   * @param {Array} params.exTxWorkerIds
   *
   */
  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.chainId = params.chainId;
    oThis.exTxWorkerIds = params.exTxWorkerIds;

    oThis.exTxWorkerAddresses = {};
    oThis.auxTokenFunderAddress = {};
    oThis.exTxWorkingAddresses = [];
    oThis.addressToBalanceMap = {};
    oThis.transferDetails = [];
  }

  /**
   * Main Performer method.
   *
   * @returns {Promise<void>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of lib/executeTransactionManagement/FundExTxWorker');

      return responseHelper.error({
        internal_error_identifier: 'l_etm_fetw_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err.toString()
      });
    });
  }

  /**
   * Async performer method.
   *
   * @returns {Promise<void>}
   * @private
   *
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._getExTxAddresses();

    // If working addresses are present,
    // there is no need to fetch exTxWorkingAddresses

    if (oThis.exTxWorkerIds) {
      oThis.exTxWorkingAddresses = oThis.exTxWorkerIds;
    } else {
      await oThis._getWorkingAddresses();
    }

    if (oThis.exTxWorkingAddresses.length) {
      await oThis._getWorkingAddressesBalance();

      await oThis._checkIfBalanceRequired();

      let transferResponse = await oThis._transferBalance();

      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone,
        taskResponseData: { transactionHashes: transferResponse }
      });
    }

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskDone
    });
  }

  /**
   * This method fetch txWorker Addresses and its respective aux funder from token addresses.
   *
   * @returns {Promise<void>}
   */
  async _getExTxAddresses() {
    const oThis = this;

    let dbRows = await new TokenAddressModel()
      .select('*')
      .where([
        'token_id = ? AND status = ?',
        oThis.tokenId,
        new TokenAddressModel().invertedStatuses[tokenAddressConstants.activeStatus]
      ])
      .where([
        'kind IN (?)',
        [
          new TokenAddressModel().invertedKinds[tokenAddressConstants.txWorkerAddressKind],
          new TokenAddressModel().invertedKinds[tokenAddressConstants.auxFunderAddressKind]
        ]
      ])
      .fire();

    for (let index = 0; index < dbRows.length; index++) {
      let dbRow = dbRows[index],
        addressKindStr = new TokenAddressModel().kinds[dbRow.kind.toString()];

      //Fetch worker id to its address map.
      if (addressKindStr === tokenAddressConstants.txWorkerAddressKind) {
        oThis.exTxWorkerAddresses[dbRow.id] = dbRow.address;
      } else {
        // Fetch aux funder address.
        oThis.auxTokenFunderAddress = dbRow.address;
      }
    }

    logger.debug('oThis.exTxWorkerAddresses', oThis.exTxWorkerAddresses);
    logger.debug('oThis.auxTokenFunderAddress', oThis.auxTokenFunderAddress);
  }

  /**
   * Get execute transaction working addresses.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getWorkingAddresses() {
    const oThis = this;

    let dbRows = await new TokenExTxWorkerProcessesModel()
      .select('*')
      .where(['token_id = ? AND tx_cron_process_detail_id IS NOT NULL', oThis.tokenId])
      .fire();

    for (let i = 0; i < dbRows.length; i++) {
      let dbRow = dbRows[i];

      // Check if the workers are active, if yes push into an array, else do nothing.
      if (oThis.exTxWorkerAddresses[dbRow.token_address_id]) {
        oThis.exTxWorkingAddresses.push(oThis.exTxWorkerAddresses[dbRow.token_address_id]);
      }
    }
  }

  /**
   * Get working addresses st Prime balance.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getWorkingAddressesBalance() {
    const oThis = this;

    logger.debug('======== oThis.exTxWorkingAddresses =======', oThis.exTxWorkingAddresses);

    if (oThis.exTxWorkingAddresses.length > 0) {
      // Fetch StPrime balance for addresses.
      const getStPrimeBalanceObj = new GetStPrimeBalance({
        auxChainId: oThis.chainId,
        addresses: oThis.exTxWorkingAddresses
      });

      oThis.addressToBalanceMap = await getStPrimeBalanceObj.perform();

      logger.debug('====== oThis.addressToBalanceMap ======', oThis.addressToBalanceMap);
    }
  }

  /**
   * Check if working addresses need balance.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _checkIfBalanceRequired() {
    const oThis = this;

    // Determine minimum balances of addresses.
    let tokenTxWorkerMinimumBalance = basicHelper.convertToBigNumber(
      fundingConfig[tokenAddressConstants.txWorkerAddressKind]
    );

    for (let address in oThis.addressToBalanceMap) {
      // Determine current balances of addresses.
      let tokenTxWorkerCurrentBalance = basicHelper.convertToBigNumber(oThis.addressToBalanceMap[address]);

      // Check for refund eligibility.
      if (tokenTxWorkerCurrentBalance.lt(tokenTxWorkerMinimumBalance.mul(minimumNoOfExecuteTransaction))) {
        let params = {
          fromAddress: oThis.auxTokenFunderAddress,
          toAddress: address,
          amountInWei: basicHelper
            .convertToWei(tokenTxWorkerMinimumBalance.mul(totalNoOfExecuteTransaction))
            .toString(10)
        };
        oThis.transferDetails.push(params);
      }
    }
  }

  /**
   * Transfer St Prime balance to active workers.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _transferBalance() {
    const oThis = this;

    if (oThis.transferDetails.length > 0) {
      const transferStPrime = new TransferStPrimeBatch({
        auxChainId: oThis.chainId,
        transferDetails: oThis.transferDetails
      });
      let response = await transferStPrime.perform();
      return response;
    }
    return {};
  }
}

InstanceComposer.registerAsShadowableClass(FundExTxWorker, coreConstants.icNameSpace, 'FundExTxWorker');

module.exports = {};
