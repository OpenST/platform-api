'use strict';

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CronBase = require(rootPrefix + '/executables/CronBase');

class PublisherBase extends CronBase {
  /**
   * Publisher base constructor
   *
   * @param params {object}
   * @param params.cronProcessId {number}
   */
  constructor(params) {
    super(params);
  }

  /**
   * _validateAndSanitize
   *
   * @private
   */
  _validateAndSanitize() {
    const oThis = this;

    logger.step('common validations done.');

    oThis._specificValidations();

    logger.step('specific validations done.');
  }

  /**
   * This function checks if there are any pending tasks left or not.
   *
   * @returns {Boolean}
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }

  // TODO - following can be moved to common place.
  /**
   * Sleep for particular time
   *
   * @param ms {Number}: time in ms
   *
   * @returns {Promise<any>}
   */
  sleep(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }

  get _topicsToPublish() {
    throw 'sub class to implement.';
  }

  get _publisher() {
    throw 'sub class to implement.';
  }
  get _messageKind() {
    throw 'sub class to implement.';
  }
}

module.exports = PublisherBase;
