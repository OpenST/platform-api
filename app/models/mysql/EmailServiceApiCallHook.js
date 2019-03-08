/**
 * Model for email service api call hooks table.
 *
 * @module app/models/mysql/EmailServiceApiCallHook
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

const dbName = 'kit_saas_big_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for Email Service API Call hooks model.
 *
 * @class EmailServiceApiCallHook
 */
class EmailServiceApiCallHook extends ModelBase {
  /**
   * Constructor for Email Service API Call hooks model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'email_service_api_call_hooks';
  }
}

module.exports = EmailServiceApiCallHook;
