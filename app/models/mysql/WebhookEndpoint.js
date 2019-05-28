/**
 * Module for webhook endpoints model.
 *
 * @module app/models/mysql/WebhookEndpoint
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for webhook endpoints model.
 *
 * @class WebhookEndpoint
 */
class WebhookEndpoint extends ModelBase {
  /**
   * Constructor for webhook endpoints model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'webhook_endpoints';
  }
}

module.exports = WebhookEndpoint;
