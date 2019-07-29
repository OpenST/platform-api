/**
 * Lib to send transactional mail.
 * This class creates entry in email async hooks table.
 *
 * @module lib/email/hookCreator/SendTransactionalMail
 */

const rootPrefix = '../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  emailServiceHooksModel = require(rootPrefix + '/app/models/mysql/EmailServiceApiCallHook'),
  emailServiceConstants = require(rootPrefix + '/lib/globalConstant/emailServiceApiCallHooks');

/**
 * Class to send transactional mail.
 *
 * @class SendTransactionalMail
 */
class SendTransactionalMail {
  /**
   * Constructor to send transactional mail.
   *
   * @params {object} params
   * @params {number/string} params.receiverEntityId
   * @params {string} params.receiverEntityKind
   * @params {string} params.templateName
   * @params {object} params.templateVars
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.receiverEntityId = params.receiverEntityId;
    oThis.receiverEntityKind = params.receiverEntityKind;
    oThis.templateName = params.templateName;
    oThis.templateVars = params.templateVars;
  }

  /**
   * Perform.
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this;

    await oThis._validate();

    const insertParamsForClient = {
      receiverEntityId: oThis.receiverEntityId,
      receiverEntityKind: oThis.receiverEntityKind,
      eventType: emailServiceConstants.sendTransactionalEmailEventType,
      params: {
        template_name: oThis.templateName,
        template_vars: oThis.templateVars
      }
    };

    await new emailServiceHooksModel().insertRecord(insertParamsForClient);

    return responseHelper.successWithData({});
  }

  /**
   * Validate input params.
   *
   * @returns {Promise<never>}
   */
  async _validate() {
    const oThis = this;

    if (
      CommonValidators.isVarNull(oThis.receiverEntityId) ||
      CommonValidators.isVarNull(oThis.receiverEntityKind) ||
      CommonValidators.isVarNull(oThis.templateName) ||
      CommonValidators.isVarNull(oThis.templateVars)
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_e_hc_stm_1',
          api_error_identifier: '',
          debug_options: {
            receiverEntityId: oThis.receiverEntityId,
            receiverEntityKind: oThis.receiverEntityKind,
            templateName: oThis.templateName,
            templateVars: oThis.templateVars
          }
        })
      );
    }
  }
}

module.exports = SendTransactionalMail;
