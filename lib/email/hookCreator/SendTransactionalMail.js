/**
 * Lib to send transactional mail.
 * This class creates entry in email async hooks table.
 *
 * @module lib/email/hookCreator/SendTransactionalMail
 */

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  pepoCampaignsConstants = require(rootPrefix + '/lib/globalConstant/pepoCampaigns'),
  emailServiceHooksModel = require(rootPrefix + '/app/models/mysql/EmailServiceApiCallHook'),
  emailServiceConstants = require(rootPrefix + '/lib/globalConstant/emailServiceApiCallHooks');

/**
 * Send transactional mail.
 *
 * @class
 */
class SendTransactionalMail {
  /**
   * Constructor.
   *
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.clientId = params.clientId;
    oThis.userId = params.userId;
  }

  /**
   * Perform
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this;

    await oThis._validate();

    let templateParams = {
      template_name: pepoCampaignsConstants.recoveryRequestSubmissionTemplate,
      template_vars: {
        sub_environment: coreConstants.subEnvironment,
        user_id: oThis.userId
      }
    };

    console.log('===templateParams====', templateParams);

    let insertParamsForClient = {
        receiverEntityId: oThis.clientId,
        receiverEntityKind: emailServiceConstants.clientReceiverEntityKind,
        eventType: emailServiceConstants.sendTransactionalEmailEventType,
        templateParams: templateParams
      },
      insertParamsForSupportTeam = {
        receiverEntityId: emailServiceConstants.receiverEntityIdForOstSupport,
        receiverEntityKind: emailServiceConstants.supportReceiverEntityKind,
        eventType: emailServiceConstants.sendTransactionalEmailEventType,
        templateParams: templateParams
      };

    let promiseArray = [];

    promiseArray.push(new emailServiceHooksModel().insertRecord(insertParamsForClient));
    promiseArray.push(new emailServiceHooksModel().insertRecord(insertParamsForSupportTeam));

    return Promise.all(promiseArray);
  }

  /**
   * Validate input params
   *
   * @returns {Promise<never>}
   */
  async _validate() {
    const oThis = this;

    if (CommonValidators.isVarNull(oThis.clientId) || CommonValidators.isVarNull(oThis.userId)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_e_hc_stm_1',
          api_error_identifier: '',
          debug_options: {
            clientId: oThis.clientId,
            userId: oThis.userId
          }
        })
      );
    }
  }
}

module.exports = SendTransactionalMail;
