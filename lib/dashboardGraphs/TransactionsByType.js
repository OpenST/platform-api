/**
 * This class helps in getting total transactions by type for various time intervals.
 *
 * @module lib/dashboardGraphs/TransactionsByName
 */
const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  DashboardGraphBase = require(rootPrefix + '/lib/dashboardGraphs/Base'),
  TransactionByTypeGraphModel = require(rootPrefix + '/app/models/mysql/TransactionByTypeGraph'),
  dashboardGraphsConstants = require(rootPrefix + '/lib/globalConstant/dashboardGraphsConstants');

/**
 * Class to get total transactions by type
 *
 */
class TotalTransactionsByName extends DashboardGraphBase {
  /**
   * constructor to get total transactions by type
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

    let transactionByTypeGraphObj = new TransactionByTypeGraphModel(),
      queryResponse = await transactionByTypeGraphObj
        .select(
          'meta_type as metaType, timestamp, SUM(`total_transfers`) as totalTransfers, SUM(`total_volume`) as totalVolume'
        )
        .group_by(['timestamp', 'meta_type'])
        .where([
          'chain_id = ? AND token_id = ? AND graph_duration_type = ? AND timestamp >= ? AND meta_type IS NOT NULL',
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
   * @param resultArray
   */
  prepareData(dataPointsArray, resultArray) {
    let oThis = this,
      finalResponse = {},
      resultTimestampToDataMap = oThis.prepareTimeStampToDataMap(resultArray);

    for (let i = 0; i < dataPointsArray.length; i++) {
      let datapoint = dataPointsArray[i];

      if (resultTimestampToDataMap[datapoint]) {
        finalResponse[datapoint] = {
          timestamp: datapoint,
          metaType: resultTimestampToDataMap[datapoint].metaType,
          totalTransfers: resultTimestampToDataMap[datapoint].totalTransfers,
          totalVolume: resultTimestampToDataMap[datapoint].totalVolume
        };
      } else {
        finalResponse[datapoint] = {
          timestamp: datapoint,
          metaType: '',
          totalTransfers: '0',
          totalVolume: '0'
        };
      }
    }

    return finalResponse;
  }
}

module.exports = TotalTransactionsByName;
