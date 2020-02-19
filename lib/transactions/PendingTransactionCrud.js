'use strict';

/**
 * Module to create pending transaction for particular chain.
 *
 * @module lib/transactions/PendingTransactionCrud
 */

const uuidv4 = require('uuid/v4');

const rootPrefix = '../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  PendingTransactionFormatter = require(rootPrefix + '/lib/formatter/blockScannerDdbData/PendingTransaction'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

class PendingTransactionCrud {
  /**
   *
   * @constructor
   *
   * @param chainId
   */
  constructor(chainId) {
    const oThis = this;
    oThis.chainId = chainId;
  }

  /***
   *
   * Insert Pending Transaction in dynamo
   *
   * @return {Promise<*>}
   */
  async create(params) {
    const oThis = this,
      transactionData = params.transactionData,
      transactionHash = params.transactionHash,
      transactionUuid = params.transactionUuid || uuidv4();

    if (!params.kind || !pendingTransactionConstants.invertedKinds[params.kind]) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_pdc_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { params: params }
        })
      );
    }

    // Get blockScanner object.
    const blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]);

    // Get pending transaction model
    const PendingTransactionModel = blockScannerObj.model.PendingTransaction,
      pendingTransactionModel = new PendingTransactionModel({ chainId: oThis.chainId });

    let currentTimestamp = Math.floor(Date.now() / 1000).toString();

    let dataToInsert = {
      transactionUuid: transactionUuid,
      chainId: oThis.chainId,
      kind: params.kind,
      transactionHash: transactionHash || '',
      fromAddress: transactionData.from || '',
      toAddress: transactionData.to || '',
      gasLimit: basicHelper.convertToBigNumber(transactionData.gas).toString(10),
      gasPrice: basicHelper.convertToBigNumber(transactionData.gasPrice).toString(10),
      input: transactionData.data || '',
      createdTimestamp: currentTimestamp,
      updatedTimestamp: currentTimestamp
    };

    if (transactionData.value) {
      dataToInsert.value = basicHelper.convertToBigNumber(transactionData.value).toString(10);
    }

    if (!CommonValidators.isVarNull(transactionData.nonce)) {
      dataToInsert.nonce = basicHelper.convertToBigNumber(transactionData.nonce).toString(10);
    }

    if (params.afterReceipt) {
      dataToInsert.afterReceipt = JSON.stringify(params.afterReceipt);
    }
    if (params.ruleId) {
      dataToInsert.ruleId = params.ruleId;
    }
    if (params.ruleAddress) {
      dataToInsert.ruleAddress = params.ruleAddress;
    }
    if (params.erc20Address) {
      dataToInsert.erc20Address = params.erc20Address;
    }
    if (params.tokenId) {
      dataToInsert.tokenId = params.tokenId;
    }
    if (params.blockNumber) {
      dataToInsert.blockNumber = params.blockNumber;
    }
    if (params.blockTimestamp) {
      dataToInsert.blockTimestamp = params.blockTimestamp;
    }
    if (params.hasOwnProperty('sessionKeyNonce')) {
      dataToInsert.sessionKeyNonce = params.sessionKeyNonce;
    }
    if (params.status) {
      dataToInsert.status = params.status;
    }
    if (params.transferExecutableData) {
      dataToInsert.transferExecutableData = params.transferExecutableData;
    }
    if (params.unsettledDebits) {
      dataToInsert.unsettledDebits = params.unsettledDebits;
    }
    if (params.eip1077Signature) {
      dataToInsert.eip1077Signature = params.eip1077Signature;
    }
    if (params.metaProperty) {
      dataToInsert.metaProperty = params.metaProperty;
    }
    if (params.transfers) {
      dataToInsert.transfers = params.transfers;
    }
    if (params.sessionKeyAddress) {
      dataToInsert.sessionKeyAddress = params.sessionKeyAddress;
    }
    if (params.redemptionDetails) {
      dataToInsert.redemptionDetails = JSON.stringify(params.redemptionDetails);
    }
    if (params.hasOwnProperty('toBeSyncedInEs')) {
      dataToInsert.toBeSyncedInEs = params.toBeSyncedInEs;
    }

    let pendingTransactionFormatter = new PendingTransactionFormatter(dataToInsert),
      formatterRsp = pendingTransactionFormatter.formatDataForDdb(),
      formattedDataForDb = formatterRsp.data;

    let insertRsp = await pendingTransactionModel.putItem(formattedDataForDb);

    if (insertRsp.isFailure()) {
      return Promise.reject(insertRsp);
    }

    pendingTransactionModel.setCache(formattedDataForDb);

    return Promise.resolve(responseHelper.successWithData(dataToInsert));
  }

  /**
   *
   * update by uuid
   *
   * @return {Promise<result>}
   */
  async update(dataToUpdate) {
    const oThis = this;

    // Get blockScanner object.
    const blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]);

    // Get pending transaction model
    const PendingTransactionModel = blockScannerObj.model.PendingTransaction,
      pendingTransactionModel = new PendingTransactionModel({ chainId: oThis.chainId });

    dataToUpdate['chainId'] = oThis.chainId.toString();
    let pendingTransactionFormatter = new PendingTransactionFormatter(dataToUpdate),
      formatterRsp = pendingTransactionFormatter.formatDataForDdb(),
      formattedDataToUpdateForDb = formatterRsp.data;

    let updateRsp = await pendingTransactionModel.updateItem(formattedDataToUpdateForDb);

    if (updateRsp.isFailure()) {
      return Promise.reject(updateRsp);
    }

    pendingTransactionFormatter = new PendingTransactionFormatter(updateRsp.data);
    formatterRsp = pendingTransactionFormatter.formatDataFromDdb();
    let formattedAllNewDataFromDb = formatterRsp.data;

    pendingTransactionFormatter = new PendingTransactionFormatter(formattedAllNewDataFromDb);
    formatterRsp = pendingTransactionFormatter.formatDataForDdb();
    let formattedAllNewDataForDb = formatterRsp.data;

    pendingTransactionModel.setCache(formattedAllNewDataForDb);

    return Promise.resolve(responseHelper.successWithData(formattedAllNewDataFromDb));
  }
}

module.exports = PendingTransactionCrud;
