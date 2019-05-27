'use strict';
/**
 * This is model for workflow_setup table.
 *
 * @module app/models/mysql/WebhookSubscription
 */
const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for workflow step model
 *
 * @class
 */
class WebhookSubscription extends ModelBase {
  /**
   * Constructor for workflow step model
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'webhook_subscriptions';
  }
}

module.exports = WebhookSubscription;
