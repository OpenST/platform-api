/**
 * Module for webhook queue model.
 *
 * @module app/models/mysql/WebhookQueue
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare variables.
const dbName = 'saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for webhook queue model.
 *
 * @class WebhookQueue
 */
class WebhookQueue extends ModelBase {
  /**
   * Constructor for webhook queue model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'webhook_queues';
  }
}

module.exports = WebhookQueue;
