/**
 * Module for error log constants.
 *
 * @module lib/globalConstant/errorLogs
 */

/**
 * Class for error log constants.
 *
 * @class ErrorLogs
 */
class ErrorLogs {
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
   * Get failed status string.
   *
   * @return {String}
   */
  static get completelyFailedStatus() {
    return 'completelyFailed';
  }

  /**
   * Get query limits for severities.
   *
   * @return {*}
   */
  static get queryLimits() {
    return {
      [ErrorLogs.highSeverity]: 100,
      [ErrorLogs.mediumSeverity]: 100,
      [ErrorLogs.lowSeverity]: 100
    };
  }

  /**
   * Get all severities.
   *
   * @return {*[]}
   */
  static get severities() {
    return [ErrorLogs.highSeverity, ErrorLogs.mediumSeverity, ErrorLogs.lowSeverity];
  }
}

module.exports = ErrorLogs;
