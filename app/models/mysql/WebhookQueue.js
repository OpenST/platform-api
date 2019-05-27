'use strict';
/**
 * This is model for workflow_setup table.
 *
 * @module app/models/mysql/WebhookQueue
 */
const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare variables.
const dbName = 'saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for workflow step model
 *
 * @class
 */
class WebhookQueue extends ModelBase {
  /**
   * Constructor for workflow step model
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'webhook_queue';
  }
}

module.exports = WebhookQueue;
