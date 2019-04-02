/**
 * This class helps in getting transactions by type for various time intervals.
 *
 * @module lib/analytics/graph/TransactionsByType
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  AnalyticsGraphBase = require(rootPrefix + '/lib/analytics/graph/Base'),
  transactionTypesConstants = require(rootPrefix + '/lib/globalConstant/transactionTypes'),
  TransactionByTypeGraphModel = require(rootPrefix + '/app/models/mysql/TransactionByTypeGraph');

/**
 * Class to get transactions by type
 *
 * @class TransactionsByType
 */
class TransactionsByType extends AnalyticsGraphBase {
  /**
   * constructor to get transactions by type
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Performer
   *
   * @returns {Promise<*>}
   */
  async perform() {
    const oThis = this;

    let allTimeSeries = oThis.getAllTimeSeries(),
      lastTimeStamp = allTimeSeries[0];

    //console.log('=====allTimeSeries',allTimeSeries);

    let transactionByTypeGraphObj = new TransactionByTypeGraphModel(),
      queryResponse = await transactionByTypeGraphObj
        .select(
          'meta_type, timestamp, SUM(`total_transfers`) as totalTransfers, SUM(`total_transactions`) as totalTransactions, SUM(`total_volume`) as totalVolume'
        )
        .group_by(['timestamp', 'meta_type'])
        .where([
          'chain_id = ? AND token_id = ? AND graph_duration_type = ? AND timestamp >= ? AND meta_type IS NOT NULL',
          oThis.auxChainId,
          oThis.tokenId,
          oThis.durationType,
          lastTimeStamp
        ])
        .fire();

    return oThis.prepareData(allTimeSeries, queryResponse);
  }

  /**
   * Prepares the data as expected in output.
   *
   * @param {Array} allTimeSeries
   * @param {Array} queryResponse
   *
   * @returns {Promise<*>}
   */
  prepareData(allTimeSeries, queryResponse) {
    let oThis = this,
      finalByTypeTransactionsResponse = {},
      finalByTypeVolumeResponse = {
        [transactionTypesConstants.userToUserTransactionType]: basicHelper.convertToBigNumber(0),
        [transactionTypesConstants.companyToUserTransactionType]: basicHelper.convertToBigNumber(0),
        [transactionTypesConstants.userToCompanyTransactionType]: basicHelper.convertToBigNumber(0)
      };

    for (let i = 0; i < allTimeSeries.length; i++) {
      let timestamp = allTimeSeries[i];
      finalByTypeTransactionsResponse[timestamp] = {
        timestamp: timestamp,
        [transactionTypesConstants.userToUserTransactionType]: basicHelper.convertToBigNumber(0),
        [transactionTypesConstants.companyToUserTransactionType]: basicHelper.convertToBigNumber(0),
        [transactionTypesConstants.userToCompanyTransactionType]: basicHelper.convertToBigNumber(0)
      };
    }

    for (let i = 0; i < queryResponse.length; i++) {
      let timestamp = queryResponse[i].timestamp,
        metaType = queryResponse[i].meta_type;
      finalByTypeTransactionsResponse[timestamp][metaType] = finalByTypeTransactionsResponse[timestamp][metaType].plus(
        basicHelper.convertToBigNumber(queryResponse[i].totalTransactions)
      );
      finalByTypeVolumeResponse[metaType] = finalByTypeVolumeResponse[metaType].plus(
        basicHelper.convertToBigNumber(queryResponse[i].totalVolume)
      );
    }

    let responseHash = {};
    responseHash['result_type'] = 'transactions_by_type';
    responseHash['transactions_by_type'] = Object.values(finalByTypeTransactionsResponse);
    responseHash['transaction_volume'] = finalByTypeVolumeResponse;
    responseHash['meta'] = {
      startTimestamp: allTimeSeries[0],
      endTimestamp: allTimeSeries[allTimeSeries.length - 1],
      duration: oThis.durationType
    };

    return responseHelper.successWithData(responseHash);
  }
}

module.exports = TransactionsByType;
