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
   * @return {Promise<void>}
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    logger.step('Common validations done.');

    await oThis._specificValidations();

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

  /**
   * Topics to publish
   *
   * @private
   */
  get _topicsToPublish() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Publisher
   *
   * @private
   */
  get _publisher() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Message kind
   *
   * @private
   */
  get _messageKind() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Specific validations
   *
   * @return {Promise<void>}
   * @private
   */
  async _specificValidations() {
    throw new Error('Sub-class to implement.');
  }
}

module.exports = PublisherBase;
