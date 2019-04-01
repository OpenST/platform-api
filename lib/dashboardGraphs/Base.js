/**
 * This class is base class for dashboard graphs
 *
 * @module lib/dashboardGraphs/TotalTransactions
 *
 */
const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  DashboardGraphBase = require(rootPrefix + '/lib/dashboardGraphs/Base'),
  dashboardGraphsConstants = require(rootPrefix + '/lib/globalConstant/dashboardGraphsConstants');

class DashboardGraphsBase {
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.chainId = params.chainId;
    oThis.currentTimeStamp = params.currentTimeStamp;
    oThis.durationType = params.durationType;
  }

  /**
   *
   *
   *
   * @returns {Array}
   */
  getAllDataPoints() {
    const oThis = this;

    switch (oThis.durationType) {
      case dashboardGraphsConstants.day:
        return oThis.fetchDaysDataPoints();
      case dashboardGraphsConstants.week:
        return oThis.fetchWeeksDataPoints();
      case dashboardGraphsConstants.month:
        return oThis.fetchMonthsDataPoints();
      case dashboardGraphsConstants.year:
        return oThis.fetchYearsDataPoints();
    }
  }

  /**
   *
   * @returns {Array}
   */
  fetchDaysDataPoints() {
    let date = new Date(),
      startOfHourTimeStampArray = [],
      currentHour = date.getUTCHours(),
      startOfHourTimeStamp = date.setUTCHours(currentHour, 0, 0, 0) / 1000;

    for (let i = 23; i >= 0; i--) {
      let hourTimeStamp = startOfHourTimeStamp - i * 3600;
      startOfHourTimeStampArray.push(hourTimeStamp);
    }
    return startOfHourTimeStampArray;
  }

  /**
   *
   *
   * @returns {Array}
   */
  fetchWeeksDataPoints() {
    let oThis = this,
      start = new Date(),
      todayStartOfDayTimestampInMS = start.setUTCHours(0, 0, 0, 0),
      todayStartOfDayTimestamp = todayStartOfDayTimestampInMS / 1000,
      startOfDayTimeStampArray = [];

    for (let i = 6; i >= 0; i--) {
      let numberOfSecondsInOneDay = 86400,
        startOfDayTimestamp = todayStartOfDayTimestamp - i * numberOfSecondsInOneDay;

      startOfDayTimeStampArray.push(startOfDayTimestamp);
    }

    return startOfDayTimeStampArray;
  }

  /**
   *
   *
   * @returns {Array}
   */
  fetchYearsDataPoints() {
    let oThis = this,
      date = new Date(),
      startOfMonthTimeStampArray = [];

    for (let i = 11; i >= 0; i--) {
      let startOfMonthTimeStamp = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - i, 1);
      startOfMonthTimeStampArray.push(startOfMonthTimeStamp / 1000);
    }

    return startOfMonthTimeStampArray;
  }

  /**
   *
   *
   * @returns {Array}
   */
  fetchMonthsDataPoints() {
    let oThis = this,
      date = new Date(),
      startOfTheDayTimeStampArray = [],
      startOfMonthTimeStamp = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, date.getUTCDate()) / 1000,
      startOfNextMonthTimeStamp = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000,
      startOfDayTimeStamp = startOfMonthTimeStamp;

    while (startOfDayTimeStamp < startOfNextMonthTimeStamp) {
      startOfTheDayTimeStampArray.push(startOfDayTimeStamp);
      startOfDayTimeStamp = startOfDayTimeStamp + 86400; //Adding number of seconds in a day to the iterator.
    }

    return startOfTheDayTimeStampArray;
  }

  /**
   *
   * @param resultArray
   */
  prepareTimeStampToDataMap(resultArray) {
    let timestampToDataMap = {};

    for (let i = 0; i < resultArray.length; i++) {
      let timestamp = resultArray[i].timestamp;
      timestampToDataMap[timestamp] = resultArray[i];
    }

    return timestampToDataMap;
  }
}

module.exports = DashboardGraphsBase;
