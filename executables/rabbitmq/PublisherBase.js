/**
 * Module for publisher base.
 *
 * @module executables/rabbitmq/PublisherBase
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CronBase = require(rootPrefix + '/executables/CronBase');

/**
 * Class for publisher base.
 *
 * @class PublisherBase
 */
class PublisherBase extends CronBase {
  /**
   * Constructor for publisher base.
   *
   * @param {object} params
   * @param {number} params.cronProcessId
   *
   * @augments CronBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Validate and sanitize.
   *
   * @private
   */
  _validateAndSanitize() {
    const oThis = this;

    logger.step('Common validations done.');

    oThis._specificValidations();

    logger.step('Specific validations done.');
  }

  /**
   * This function checks if there are any pending tasks left or not.
   *
   * @returns {boolean}
   */
  _pendingTasksDone() {
    const oThis = this;

    logger.info(':: _pendingTasksDone called');

    return oThis.canExit;
  }

  get _topicsToPublish() {
    throw new Error('Sub-class to implement.');
  }

  get _publisher() {
    throw new Error('Sub-class to implement.');
  }

  get _messageKind() {
    throw new Error('Sub-class to implement.');
  }
}

module.exports = PublisherBase;
