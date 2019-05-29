/**
 * Module for pending webhooks model.
 *
 * @module app/models/mysql/PendingWebhook
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare variables.
const dbName = 'saas_big_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for pending webhooks model.
 *
 * @class PendingWebhook
 */
class PendingWebhook extends ModelBase {
  /**
   * Constructor for pending webhooks model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'pending_webhooks';
  }
}

module.exports = PendingWebhook;
