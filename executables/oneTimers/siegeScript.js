/**
 * Module to get siege details.
 *
 * @module executables/oneTimers/siegeScript
 */

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner');

/**
 * Class to get siege details.
 *
 * @class GetSiegeDetails
 */
class GetSiegeDetails {
  /**
   * Constructor to get siege details.
   *
   * @param {object} params
   * @param {number} params.startBlockNumber
   * @param {number} params.endBlockNumber
   * @param {number} params.chainId
   */
  constructor(params) {
    const oThis = this;

    oThis.startBlockNumber = params.startBlockNumber;
    oThis.endBlockNumber = params.endBlockNumber;
    oThis.chainId = params.chainId;

    oThis.GetBlockTransactions = {};
    oThis.blockTransactionsMapping = {};
    oThis.successfulTransactions = 0;
    oThis.failedTransactions = 0;
    oThis.blocksCount = 0;
  }

  /**
   * Perform.
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this,
      promiseArray = [];

    const blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]);
    oThis.GetBlockTransactions = blockScannerObj.block.GetTransaction;

    for (let index = oThis.startBlockNumber; index <= oThis.endBlockNumber; index++) {
      promiseArray.push(oThis._fetchTransactions(index));
      await basicHelper.sleep(1 * 1000);
    }

    const blockPromisesResponse = await Promise.all(promiseArray);

    for (let index = 0; index < blockPromisesResponse.length; index++) {
      const blockResponse = blockPromisesResponse[index];
      oThis.blockTransactionsMapping[oThis.startBlockNumber + index] = {};
      oThis.blockTransactionsMapping[oThis.startBlockNumber + index].successfulTransactions = blockResponse[0];
      oThis.blockTransactionsMapping[oThis.startBlockNumber + index].failedTransactions = blockResponse[1];

      oThis.blocksCount += 1;
    }

    console.log(`\nTotal blocks: ${oThis.blocksCount}`);
    console.log(`\nTotal transactions across all blocks: ${oThis.successfulTransactions + oThis.failedTransactions}`);
    console.log(`\nTotal successful transactions across all blocks: ${oThis.successfulTransactions}`);
    console.log(`\nTotal failed transactions across all blocks: ${oThis.failedTransactions}`);
    console.log(
      `\nAverage successful transactions across all blocks: ${oThis.successfulTransactions / oThis.blocksCount}`
    );
  }

  /**
   * Fetch all transactions from block.
   *
   * @param {number} blockNumber
   *
   * @return {Promise<array>}
   * @private
   */
  async _fetchTransactions(blockNumber) {
    const oThis = this,
      getBlockTransactions = new oThis.GetBlockTransactions(oThis.chainId, blockNumber, {});

    // Get block transactions.
    const blockTransactionHashes = await oThis._fetchBlockTransactionHashes(getBlockTransactions, blockNumber, []);

    if (!blockTransactionHashes) {
      logger.error('Data not found.');
    }

    if (blockTransactionHashes.length > 0) {
      return oThis._fetchTransactionDetails(blockTransactionHashes);
    }

    return [0, 0];
  }

  /**
   * Fetch all transaction hashes in a block.
   *
   * @param {object} getBlockTransactions
   * @param {number} blockNumber
   * @param {array} blockTransactionHashes
   *
   * @return {Promise<*>}
   * @private
   */
  async _fetchBlockTransactionHashes(getBlockTransactions, blockNumber, blockTransactionHashes) {
    const oThis = this;

    // Get block transactions.
    const blockGetResponse = await getBlockTransactions.perform().catch(function() {
      logger.error('Error in block get transaction service.');
    });

    if (blockGetResponse.isFailure()) {
      logger.error('Block details get transaction service failed.');

      return;
    }

    for (let index = 0; index < blockGetResponse.data.transactionHashes.length; index++) {
      blockTransactionHashes.push(blockGetResponse.data.transactionHashes[index]);
    }

    if (blockGetResponse.data.nextPagePayload.LastEvaluatedKey) {
      // Get block transaction hashes.
      const getBlockTransactionHashes = new oThis.GetBlockTransactions(oThis.chainId, blockNumber, {
        nextPagePayload: blockGetResponse.data.nextPagePayload
      });

      return oThis._fetchBlockTransactionHashes(getBlockTransactionHashes, blockNumber, blockTransactionHashes);
    }

    return blockTransactionHashes;
  }

  /**
   * Fetch transaction details.
   *
   * @param {array} blockTransactionHashes
   *
   * @return {Promise<array>}
   * @private
   */
  async _fetchTransactionDetails(blockTransactionHashes) {
    const oThis = this,
      promiseArray = [];

    let successfulBlockTransactions = 0,
      failedBlockTransactions = 0;

    const blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]),
      GetTransactionDetails = blockScannerObj.transaction.Get;

    while (blockTransactionHashes.length) {
      const currentTransactionHashes = blockTransactionHashes.splice(0, 100);

      const getTransactionDetails = new GetTransactionDetails(oThis.chainId, currentTransactionHashes);

      promiseArray.push(
        getTransactionDetails.perform().catch(function() {
          logger.error('Error in get transaction service.');
        })
      );
    }

    const promiseArrayResponse = await Promise.all(promiseArray);

    for (let index = 0; index < promiseArrayResponse.length; index++) {
      const transactionGetResponse = promiseArrayResponse[index],
        transactionDetails = transactionGetResponse.data;

      for (const transactionHash in transactionDetails) {
        if (transactionDetails[transactionHash] && transactionDetails[transactionHash].transactionStatus === '1') {
          oThis.successfulTransactions += 1;
          successfulBlockTransactions += 1;
        } else {
          oThis.failedTransactions += 1;
          failedBlockTransactions += 1;
        }
      }
    }

    return [successfulBlockTransactions, failedBlockTransactions];
  }
}

module.exports = GetSiegeDetails;

new GetSiegeDetails({
  chainId: 202,
  startBlockNumber: 1208055,
  endBlockNumber: 1208289
})
  .perform()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.log('ERROR=========', err);
    process.exit(1);
  });
