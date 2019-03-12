/**
 * Model for email service api call hooks table.
 *
 * @module app/models/mysql/EmailServiceApiCallHook
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  emailServiceConstants = require(rootPrefix + '/lib/globalConstant/emailServiceApiCallHooks');

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
   * @param {Object} params
   * @param {Integer} params.receiverEntityId
   * @param {Integer} params.receiverEntityKind
   * @param {Integer} params.eventType
   * @param {Integer} params.customDescription
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
      throw 'Mandatory parameters are missing. Expected an object with the following keys: {receiverEntityId, receiverEntityKind, eventType, customDescription }';
    }

    let insertResponse = await oThis
      .insert({
        receiver_entity_id: params.receiverEntityId,
        receiver_entity_kind: emailServiceConstants.getInvertedReceiverEntityKinds[params.receiverEntityKind],
        event_type: emailServiceConstants.getInvertedEventTypes[params.eventType],
        execution_timestamp: params.executionTimestamp || Date.now(),
        custom_description: params.customDescription || null,
        params: params
      })
      .fire();

    return Promise.resolve(responseHelper.successWithData(insertResponse.insertId));
  }
}

module.exports = EmailServiceApiCallHook;
