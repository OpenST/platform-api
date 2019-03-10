'use strict';

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CronBase = require(rootPrefix + '/executables/CronBase');

class PublisherBase extends CronBase {
  /**
   * Publisher base constructor
   *
   * @param {Object} params
   * @param {Number} params.cronProcessId
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

    logger.info(':: _pendingTasksDone called');

    return oThis.canExit;
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
