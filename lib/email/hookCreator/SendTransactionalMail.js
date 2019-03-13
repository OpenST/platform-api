/**
 *
 *
 * @module lib/email/hookCreator/SendTransactionalMail
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
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
  }

  /**
   * Perform
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this;

    let templateDetails = {};

    let insertParamsForClient = {
        receiverEntityId: oThis.clientId,
        receiverEntityKind: emailServiceConstants.clientReceiverEntityKind,
        eventType: emailServiceConstants.sendTransactionalEmailEventType,
        template_name: pepoCampaignsConstants.initiateRecoveryMailTemplate
      },
      insertParamsForSupportTeam = {
        receiverEntityId: emailServiceConstants.receiverEntityIdForOstSupport,
        receiverEntityKind: emailServiceConstants.supportReceiverEntityKind,
        eventType: emailServiceConstants.sendTransactionalEmailEventType,
        template_name: pepoCampaignsConstants.initiateRecoveryMailTemplate
      };

    let promiseArray = [];

    promiseArray.push(new emailServiceHooksModel().insertRecord(insertParamsForClient));
    promiseArray.push(new emailServiceHooksModel().insertRecord(insertParamsForSupportTeam));

    return Promise.all(promiseArray);
  }
}

module.exports = SendTransactionalMail;
