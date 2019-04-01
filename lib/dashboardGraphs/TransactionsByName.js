/**
 * This class helps in getting total transactions by name for various time intervals.
 *
 * @module lib/dashboardGraphs/TransactionsByName
 */
const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  DashboardGraphBase = require(rootPrefix + '/lib/dashboardGraphs/Base'),
  TransactionByNameGraphModel = require(rootPrefix + '/app/models/mysql/TransactionByNameGraph'),
  dashboardGraphsConstants = require(rootPrefix + '/lib/globalConstant/dashboardGraphsConstants');

/**
 * Class to get total transactions by name
 *
 */
class TotalTransactionsByName extends DashboardGraphBase {
  /**
   * constructor to get total transactions by name
   *
   * @param params
   */
  constructor(params) {
    super(params);
  }

  /**
   * Perform
   *
   * @returns {Promise<*|result>}
   */
  async perform() {
    const oThis = this;

    let dataPointsArray = oThis.getAllDataPoints(),
      lastTimeStamp = dataPointsArray[0];

    let transactionByNameGraphObj = new TransactionByNameGraphModel(),
      queryResponse = await transactionByNameGraphObj
        .select('meta_name, SUM(`total_transfers`) as total_transfers')
        .group_by(['meta_name'])
        .where([
          'chain_id = ? AND token_id = ? AND graph_duration_type = ? AND timestamp >= ? AND meta_name IS NOT NULL',
          oThis.chainId,
          oThis.tokenId,
          oThis.durationType,
          lastTimeStamp
        ])
        .order_by({ total_transfers: 'DESC' })
        .limit(5)
        .fire();

    return responseHelper.successWithData(oThis.prepareData(dataPointsArray, queryResponse));
  }

  /**
   * Prepares formatted data that is to be sent
   *
   * @param {Array} queryResponse
   * @returns {Array}
   */
  prepareData(dataPointsArray, queryResponse) {
    let oThis = this,
      resultArray = [];

    for (let i = 0; i < queryResponse.length; i++) {
      let dataMap = {};
      dataMap['name'] = queryResponse[i].meta_name;
      dataMap['total_transfers'] = queryResponse[i].total_transfers;

      resultArray.push(dataMap);
    }

    let responseHash = {};
    responseHash['result_type'] = 'transaction_by_name';
    responseHash['transaction_by_name'] = resultArray;
    responseHash['meta'] = {
      startTimestamp: dataPointsArray[0],
      endTimestamp: dataPointsArray[dataPointsArray.length - 1],
      duration: oThis.durationType
    };

    return responseHash;
  }
}

module.exports = TotalTransactionsByName;
