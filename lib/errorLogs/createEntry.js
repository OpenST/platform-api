/**
 * Module for creating entry in error_logs table.
 *
 * @module lib/errorLogs/createEntry
 */

const rootPrefix = '../..',
  ErrorLogsModel = require(rootPrefix + '/app/models/mysql/ErrorLogsModel'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class to create entry in error_logs table.
 *
 * @class CreateEntry
 */
class CreateEntry {
  /**
   * Performer method for class.
   *
   * @param {Object} errorObject
   * @param {String} [severity]: defaults to high.
   *
   * @return {Promise<void>}
   */
  perform(errorObject, severity) {
    const oThis = this;

    return oThis._asyncPerform(errorObject, severity).catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      console.error(`${__filename}::perform::catch`);
      console.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_el_ce_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async performer.
   *
   * @param {Object} errorObject
   * @param {String} severity
   *
   * @return {Promise<void>}
   */
  async _asyncPerform(errorObject, severity) {
    const oThis = this;

    const inputParams = CreateEntry._validateInputParams(errorObject, severity);

    oThis._setVariables();

    await oThis._insertEntry(inputParams.severity, inputParams.kind, inputParams.data);
  }

  /**
   * Validate input parameters.
   *
   * @param {Object} errorObject
   * @param {String} severity
   *
   * @return {*}
   *
   * @private
   */
  static _validateInputParams(errorObject, severity) {
    const kind = errorObject.internalErrorCode,
      data = JSON.stringify(errorObject.getDebugData());

    if (!severity) {
      console.error('Severity not sent. Setting as high.');
      severity = ErrorLogsConstants.highSeverity;
    }

    if (!kind || !data) {
      console.error('Mandatory parameters missing. Please send correct error object.');

      return Promise.reject(new Error('Mandatory parameters missing. Please send correct error object.'));
    }

    if (!ErrorLogsConstants.severities.includes(severity)) {
      return Promise.reject(new Error('Invalid severity.'));
    }

    if (!(typeof severity === 'string') || !(typeof kind === 'string')) {
      return Promise.reject(new TypeError('Data types of severity and kind should be string.'));
    }

    return {
      severity: severity,
      kind: kind,
      data: data
    };
  }

  /**
   * Set variables from core environment variables.
   *
   * @private
   */
  _setVariables() {
    const oThis = this;

    oThis.envIdentifier = coreConstants.ENV_IDENTIFIER;
    oThis.appName = coreConstants.APP_NAME;
    oThis.ipAddress = coreConstants.IP_ADDRESS;
  }

  /**
   * Insert entry in error_logs table.
   *
   * @param {String} severity
   * @param {String} kind
   * @param {String} data
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _insertEntry(severity, kind, data) {
    const oThis = this;

    await new ErrorLogsModel()
      .insert({
        app: oThis.appName,
        env_id: oThis.envIdentifier,
        severity: severity,
        machine_ip: oThis.ipAddress,
        kind: kind,
        data: data,
        status: ErrorLogsConstants.createdStatus
      })
      .fire();

    console.log('Entry created successfully in error_logs table.');
  }
}

module.exports = new CreateEntry();
