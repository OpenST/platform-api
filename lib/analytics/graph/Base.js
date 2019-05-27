/**
 * This class is base class for analytics graphs
 *
 * @module lib/analytics/graph/Base
 *
 */
const rootPrefix = '../../..',
  graphConstants = require(rootPrefix + '/lib/globalConstant/graphConstants');

/**
 * Class for Analytics Graph Base.
 *
 * @class AnalyticsGraphBase
 */
class AnalyticsGraphBase {
  /**
   * Constructor
   *
   * @param params
   * @param {Number} params.tokenId
   * @param {Number} params.auxChainId
   * @param {String} params.durationType
   * @param {Number} params.currentTimestamp
   * @param {Number} params.tokenDecimals - stake currency decimals for given token id
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.auxChainId = params.auxChainId;
    oThis.durationType = params.durationType;
    oThis.currentTimestamp = params.currentTimestamp;
    oThis.tokenDecimals = params.tokenDecimals;
    oThis.metaStartTimestamp = null;
    oThis.metaEndTimestamp = null;
  }

  /**
   * Get all time series based on graph duration type
   *
   * @returns {Array}
   */
  getAllTimeSeries() {
    const oThis = this;

    switch (oThis.durationType) {
      case graphConstants.durationTypeDay:
        return oThis.fetchDaysTimeSeries();
      case graphConstants.durationTypeWeek:
        return oThis.fetchWeeksTimeSeries();
      case graphConstants.durationTypeMonth:
        return oThis.fetchMonthsTimeSeries();
      case graphConstants.durationTypeYear:
        return oThis.fetchYearsTimeSeries();
    }
  }

  /**
   * Fetch time series for Day duration
   *
   * @returns {Array}
   */
  fetchDaysTimeSeries() {
    const oThis = this;

    let date = new Date(oThis.currentTimestamp),
      timeSeriesInSecs = [],
      secondsInAHour = 3600,
      startOfHourTimeStamp = date.setUTCHours(date.getUTCHours(), 0, 0, 0) / 1000;

    for (let hour = 23; hour >= 0; hour--) {
      let hourTimestamp = startOfHourTimeStamp - hour * secondsInAHour;
      timeSeriesInSecs.push(hourTimestamp);
    }

    oThis.metaStartTimestamp = timeSeriesInSecs[0];
    oThis.metaEndTimestamp = timeSeriesInSecs[timeSeriesInSecs.length - 1];

    return timeSeriesInSecs;
  }

  /**
   * Fetch time series for Week duration
   *
   * @returns {Array}
   */
  fetchWeeksTimeSeries() {
    const oThis = this;

    let date = new Date(oThis.currentTimestamp),
      timeSeriesInSecs = [],
      secondsInADay = 86400,
      startOfDayTimestamp = date.setUTCHours(0, 0, 0, 0) / 1000;

    for (let day = 6; day >= 0; day--) {
      let dayTimestamp = startOfDayTimestamp - day * secondsInADay;
      timeSeriesInSecs.push(dayTimestamp);
    }

    oThis.metaStartTimestamp = timeSeriesInSecs[0];
    oThis.metaEndTimestamp = timeSeriesInSecs[timeSeriesInSecs.length - 1];

    return timeSeriesInSecs;
  }

  /**
   * Fetch time series for Month duration
   *
   * @returns {Array}
   */
  fetchMonthsTimeSeries() {
    const oThis = this;

    let date = new Date(oThis.currentTimestamp),
      timeSeriesInSecs = [],
      secondsInADay = 86400,
      startOfDayTimestamp = date.setUTCHours(0, 0, 0, 0) / 1000;

    for (let day = 30; day >= 0; day--) {
      let dayTimestamp = startOfDayTimestamp - day * secondsInADay;
      timeSeriesInSecs.push(dayTimestamp);
    }

    oThis.metaStartTimestamp = timeSeriesInSecs[0];
    oThis.metaEndTimestamp = timeSeriesInSecs[timeSeriesInSecs.length - 1];

    return timeSeriesInSecs;
  }

  /**
   * Fetch time series for Year duration
   *
   * @returns {Array}
   */
  fetchYearsTimeSeries() {
    const oThis = this;

    let date = new Date(oThis.currentTimestamp),
      timeSeriesInSecs = [];

    for (let month = 11; month >= 0; month--) {
      let monthTimestamp = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - month, 1) / 1000;

      if (month == 0) {
        oThis.metaEndTimestamp = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - month, date.getUTCDay()) / 1000;
      }

      timeSeriesInSecs.push(monthTimestamp);
    }

    oThis.metaStartTimestamp = timeSeriesInSecs[0];

    return timeSeriesInSecs;
  }

  /**
   * Returns a map indexed by timestamp.
   *
   * @param {Array} resultArray
   * @returns {Object} timestampToDataMap
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

module.exports = AnalyticsGraphBase;
