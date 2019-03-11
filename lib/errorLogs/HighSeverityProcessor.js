/**
 * Module to process high severity issues.
 *
 * @module lib/errorLogs/HighSeverityProcessor
 */

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class to process high severity error.
 *
 * @class HighSeverityProcessor
 */
class HighSeverityProcessor {
  /**
   * Constructor to process high severity error.
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

    for (let index = 0; index < oThis.errorEntries.length; index++) {
      const errorEntry = oThis.errorEntries[index];

      promisesArray.push(oThis._sendEmail(errorEntry));
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
