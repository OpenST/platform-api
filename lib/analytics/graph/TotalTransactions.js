/**
 * This class helps in getting total transactions for various time intervals.
 *
 * @module lib/analytics/graph/TotalTransactions
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  AnalyticsGraphBase = require(rootPrefix + '/lib/analytics/graph/Base'),
  TransactionByTypeGraphModel = require(rootPrefix + '/app/models/mysql/TransactionByTypeGraph');

/**
 * Class to get total transactions.
 *
 * @class TotalTransactions
 */
class TotalTransactions extends AnalyticsGraphBase {
  /**
   * constructor to get total transactions
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Performer
   *
   * @return {Promise<*>}
   */
  async perform() {
    const oThis = this;

    let allTimeSeries = oThis.getAllTimeSeries(),
      lastTimeStamp = allTimeSeries[0];

    let transactionByTypeGraphObj = new TransactionByTypeGraphModel(),
      queryResponse = await transactionByTypeGraphObj
        .select(
          'timestamp, SUM(`total_transfers`) as totalTransfers, SUM(`total_transactions`) as totalTransactions, SUM(`total_volume`) as totalVolume'
        )
        .group_by(['timestamp'])
        .where([
          'chain_id = ? AND token_id = ? AND graph_duration_type = ? AND timestamp >= ?',
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
   * @returns {*|result}
   */
  prepareData(allTimeSeries, queryResponse) {
    let oThis = this,
      finalResultArray = [],
      resultTimestampToDataMap = oThis.prepareTimeStampToDataMap(queryResponse);

    for (let i = 0; i < allTimeSeries.length; i++) {
      let timestamp = allTimeSeries[i],
        dataHash = {};

      if (resultTimestampToDataMap[timestamp]) {
        dataHash = {
          timestamp: timestamp,
          token_transfers: resultTimestampToDataMap[timestamp].totalTransfers,
          token_transactions: resultTimestampToDataMap[timestamp].totalTransactions,
          token_ost_volume: resultTimestampToDataMap[timestamp].totalVolume
        };

        delete resultTimestampToDataMap[timestamp];
      } else {
        dataHash = {
          timestamp: timestamp,
          token_transfers: 0,
          token_transactions: 0,
          token_ost_volume: 0
        };
      }
      finalResultArray.push(dataHash);
    }

    if (Object.keys(resultTimestampToDataMap).length > 0) {
      logger.error('Incorrect data found in analytics table. Extra data: ', Object.keys(resultTimestampToDataMap));
      return responseHelper.error({
        internal_error_identifier: 'l_a_g_tt_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: { resultTimestampToDataMap: resultTimestampToDataMap }
      });
    }

    let responseHash = {};
    responseHash['result_type'] = 'total_transactions';
    responseHash['total_transactions'] = finalResultArray;
    responseHash['meta'] = {
      startTimestamp: allTimeSeries[0],
      endTimestamp: allTimeSeries[allTimeSeries.length - 1],
      duration: oThis.durationType
    };

    return responseHelper.successWithData(responseHash);
  }
}

module.exports = TotalTransactions;
