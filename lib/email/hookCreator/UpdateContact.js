/**
 * This class creates entry in email async hooks table for update contact event
 *
 * @module lib/email/hookCreator/UpdateContact
 */

const rootPrefix = '../../..',
  EmailServiceHooksModel = require(rootPrefix + '/app/models/mysql/EmailServiceApiCallHook'),
  emailServiceConstants = require(rootPrefix + '/lib/globalConstant/emailServiceApiCallHooks'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class UpdateContact {
  /**
   * Constructor to update contact.
   *
   * @params {object} params
   * @params {number/string} params.receiverEntityId
   * @params {string} params.receiverEntityKind
   * @params {object} params.customAttributes
   * @params {object} params.userSettings
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.receiverEntityId = params.receiverEntityId;
    oThis.receiverEntityKind = params.receiverEntityKind;
    oThis.customAttributes = params.customAttributes;
    oThis.userSettings = params.userSettings;
  }

  /**
   * Perform
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._insertHook();

    return responseHelper.successWithData({});
  }

  /**
   * Insert entry in email service hooks table
   *
   * @return {Promise<void>}
   * @private
   */
  async _insertHook() {
    const oThis = this;

    const insertParamsForClient = {
      receiverEntityId: oThis.receiverEntityId,
      receiverEntityKind: oThis.receiverEntityKind,
      eventType: emailServiceConstants.updateContactEventType,
      params: {
        custom_attributes: oThis.customAttributes,
        user_settings: oThis.userSettings
      }
    };

    await new EmailServiceHooksModel().insertRecord(insertParamsForClient);
  }
}

module.exports = UpdateContact;
