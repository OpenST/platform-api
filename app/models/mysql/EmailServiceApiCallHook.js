/**
 * Model for email service api call hooks table.
 *
 * @module app/models/mysql/EmailServiceApiCallHook
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  emailServiceConstants = require(rootPrefix + '/lib/globalConstant/emailServiceApiCallHooks');

// Declare variables.
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

  /**
   * This method inserts an entry in the table.
   *
   * @param {object} params
   * @param {number} params.receiverEntityId: mail receiver id
   * @param {number} params.receiverEntityKind: mail receiver kind
   * @param {number} params.eventType
   * @param {number} params.customDescription
   * @param {number} params.params: custom attributes, settings, etc.
   *
   * @returns {*}
   */
  async insertRecord(params) {
    const oThis = this;

    // Perform validations.
    if (
      !params.hasOwnProperty('receiverEntityId') ||
      !params.hasOwnProperty('receiverEntityKind') ||
      !params.hasOwnProperty('eventType')
    ) {
      throw new Error(
        'Mandatory parameters are missing. Expected an object with the following keys: {receiverEntityId, receiverEntityKind, eventType }.'
      );
    }

    return oThis
      .insert({
        receiver_entity_id: params.receiverEntityId,
        receiver_entity_kind: emailServiceConstants.getInvertedReceiverEntityKinds[params.receiverEntityKind],
        event_type: emailServiceConstants.getInvertedEventTypes[params.eventType],
        execution_timestamp: params.executionTimestamp || Math.floor(Date.now() / 1000),
        custom_description: params.customDescription || null,
        params: JSON.stringify(params.params)
      })
      .fire();
  }
}

module.exports = EmailServiceApiCallHook;
