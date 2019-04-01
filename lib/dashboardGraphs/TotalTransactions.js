/**
 * This class helps in getting total transactions for various time intervals.
 *
 * @module lib/dashboardGraphs/TotalTransactions
 */
const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  DashboardGraphBase = require(rootPrefix + '/lib/dashboardGraphs/Base'),
  TransactionByNameGraphModel = require(rootPrefix + '/app/models/mysql/TransactionByNameGraph'),
  dashboardGraphsConstants = require(rootPrefix + '/lib/globalConstant/dashboardGraphsConstants');

/**
 * Class to get total transactions
 *
 */
class TotalTransactions extends DashboardGraphBase {
  /**
   * constructor to get total transactions
   *
   * @param params
   */
  constructor(params) {
    super(params);
  }

  async perform() {
    const oThis = this;

    let dataPointsArray = oThis.getAllDataPoints(),
      lastTimeStamp = dataPointsArray[0];

    let transactionByNameGraphObj = new TransactionByNameGraphModel(),
      queryResponse = await transactionByNameGraphObj
        .select(
          'timestamp, SUM(`total_transfers`) as totalTransfers, SUM(`total_transactions`) as totalTransactions, SUM(`total_volume`) as totalVolume'
        )
        .group_by(['timestamp'])
        .where([
          'chain_id = ? AND token_id = ? AND graph_duration_type = ? AND timestamp >= ?',
          oThis.chainId,
          oThis.tokenId,
          oThis.durationType,
          lastTimeStamp
        ])
        .fire();

    return oThis.prepareData(dataPointsArray, queryResponse);
  }

  /**
   *
   * @param dataPointsArray
   * @param queryResponse
   */
  prepareData(dataPointsArray, queryResponse) {
    let oThis = this,
      finalResultArray = [],
      resultTimestampToDataMap = oThis.prepareTimeStampToDataMap(queryResponse);

    for (let i = 0; i < dataPointsArray.length; i++) {
      let datapoint = dataPointsArray[i],
        dataHash = {};

      if (resultTimestampToDataMap[datapoint]) {
        dataHash = {
          timestamp: datapoint,
          token_transfers: resultTimestampToDataMap[datapoint].totalTransfers,
          token_transactions: resultTimestampToDataMap[datapoint].totalTransactions,
          token_ost_volume: resultTimestampToDataMap[datapoint].totalVolume
        };
      } else {
        dataHash = {
          timestamp: datapoint,
          token_transfers: 0,
          token_transactions: 0,
          token_ost_volume: 0
        };
      }
      finalResultArray.push(dataHash);
    }

    let responseHash = {};
    responseHash['result_type'] = 'number_transactions';
    responseHash['number_transactions'] = finalResultArray;
    responseHash['meta'] = {
      startTimestamp: dataPointsArray[0],
      endTimestamp: dataPointsArray[dataPointsArray.length - 1],
      duration: oThis.durationType
    };

    return responseHash;
  }
}

module.exports = TotalTransactions;
