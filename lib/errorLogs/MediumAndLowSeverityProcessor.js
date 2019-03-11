/**
 * Module to process medium and low severity issues.
 *
 * @module lib/errorLogs/MediumAndLowSeverityProcessor
 */

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class to process medium and low severity errors.
 *
 * @class HighSeverityProcessor
 */
class HighSeverityProcessor {
  /**
   * Constructor to process medium and low severity errors.
   *
   * @param {Array} errorEntries
   *
   * @constructor
   */
  constructor(errorEntries) {
    const oThis = this;

    oThis.errorEntries = errorEntries;
  }

  /**
   * Main performer for class.
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this,
      promisesArray = [];

    const finalResult = {};

    for (let index = 0; index < oThis.errorEntries.length; index++) {
      const errorEntry = oThis.errorEntries[index],
        appType = errorEntry.app,
        envId = errorEntry.env_id,
        kind = errorEntry.kind;

      finalResult[appType] = finalResult[appType] || {};
      finalResult[appType][envId] = finalResult[appType][envId] || {};
      finalResult[appType][envId][kind] = finalResult[appType][envId][kind] || {
        count: 0,
        ids: [],
        machineIps: [],
        severity: errorEntry.severity
      };

      finalResult[appType][envId][kind].count++;
      finalResult[appType][envId][kind].ids.push(errorEntry.id);
      finalResult[appType][envId][kind].machineIps.push(errorEntry.machine_ip);
    }

    await Promise.all(promisesArray);
  }

  /**
   * Send email for high priority error entity.
   *
   * @param errorEntry
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _sendEmail(errorEntry) {
    const oThis = this;
  }
}
