/**
 * This class helps in getting transactions by name for various time intervals.
 *
 * @module lib/analytics/graph/TransactionsByName
 */
const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  AnalyticsGraphBase = require(rootPrefix + '/lib/analytics/graph/Base'),
  TransactionByNameGraphModel = require(rootPrefix + '/app/models/mysql/TransactionByNameGraph');

/**
 * Class to get total transactions by name
 *
 * @class TransactionsByName
 */
class TransactionsByName extends AnalyticsGraphBase {
  /**
   * constructor to get transactions by name
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

    let transactionByNameGraphObj = new TransactionByNameGraphModel(),
      queryResponse = await transactionByNameGraphObj
        .select(
          'meta_name, SUM(`total_transfers`) as totalTransfers, SUM(`total_transactions`) as totalTransactions, SUM(`total_volume`) as totalVolume'
        )
        .group_by(['meta_name'])
        .where([
          'chain_id = ? AND token_id = ? AND graph_duration_type = ? AND timestamp >= ? AND meta_name IS NOT NULL',
          oThis.auxChainId,
          oThis.tokenId,
          oThis.durationType,
          lastTimeStamp
        ])
        .order_by({ totalTransactions: 'DESC' })
        .limit(5)
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
      resultArray = [],
      resultArrayHasNonZeroData = false;

    for (let i = 0; i < queryResponse.length; i++) {
      let dataMap = {
        name: queryResponse[i].meta_name,
        total_transfers: queryResponse[i].totalTransfers,
        total_transactions: queryResponse[i].totalTransactions,
        total_ost_volume: basicHelper.toPrecessionBT(queryResponse[i].totalVolume)
      };
      if (basicHelper.convertToBigNumber(queryResponse[i].totalTransactions).gt('0')) {
        resultArrayHasNonZeroData = true;
      }
      resultArray.push(dataMap);
    }

    let responseHash = {};
    responseHash['result_type'] = 'transactions_by_name';
    responseHash['transactions_by_name'] = resultArrayHasNonZeroData ? resultArray : [];
    responseHash['meta'] = {
      startTimestamp: oThis.metaStartTimestamp,
      endTimestamp: oThis.metaEndTimestamp,
      duration: oThis.durationType
    };

    return responseHelper.successWithData(responseHash);
  }
}

module.exports = TransactionsByName;
