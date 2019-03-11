/**
 * Module for error log constants.
 *
 * @module lib/errorLogs/errorLogsConstants
 */

/**
 * Class for error log constants.
 *
 * @class
 */
class ErrorLogsConstants {
  /**
   * Get high severity string.
   *
   * @return {String}
   */
  static get highSeverity() {
    return 'high';
  }

  /**
   * Get medium severity string.
   *
   * @return {String}
   */
  static get mediumSeverity() {
    return 'medium';
  }

  /**
   * Get low severity string.
   *
   * @return {String}
   */
  static get lowSeverity() {
    return 'low';
  }

  /**
   * Get created status string.
   *
   * @return {String}
   */
  static get createdStatus() {
    return 'created';
  }

  /**
   * Get processed status string.
   *
   * @return {String}
   */
  static get processedStatus() {
    return 'processed';
  }

  /**
   * Get failed status string.
   *
   * @return {String}
   */
  static get failedStatus() {
    return 'failed';
  }

  /**
   * Get sleep times for severities.
   *
   * @return {*}
   */
  static get sleepTimes() {
    return {
      [ErrorLogsConstants.highSeverity]: 1000 * 10, // 10 seconds.
      [ErrorLogsConstants.mediumSeverity]: 1000 * 60 * 5, // 5 minutes.
      [ErrorLogsConstants.lowSeverity]: 1000 * 60 * 10 // 10 minutes.
    };
  }

  /**
   * Get all severities.
   *
   * @return {*[]}
   */
  static get severities() {
    return [ErrorLogsConstants.highSeverity, ErrorLogsConstants.mediumSeverity, ErrorLogsConstants.lowSeverity];
  }
}

module.exports = ErrorLogsConstants;
