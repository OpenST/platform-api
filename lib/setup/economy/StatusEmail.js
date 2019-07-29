/**
 * Token setup status email
 *
 * @module lib/setup/economy/StatusEmail
 */
const rootPrefix = '../../..',
  TokenByClientIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  SendTransactionalMail = require(rootPrefix + '/lib/email/hookCreator/SendTransactionalMail'),
  ClientMileStoneHook = require(rootPrefix + '/lib/email/hookCreator/ClientMileStone'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  environmentConstants = require(rootPrefix + '/lib/globalConstant/environmentInfo'),
  pepoCampaignsConstants = require(rootPrefix + '/lib/globalConstant/pepoCampaigns'),
  emailServiceConstants = require(rootPrefix + '/lib/globalConstant/emailServiceApiCallHooks');

class SendTokenSetupStatusEmail {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.clientId = params.clientId;
    oThis.setupStatus = params.setupStatus;
    oThis.tokenId = params.tokenId;
  }

  /**
   * Perform
   *
   * @return {Promise<never>}
   */
  async perform() {
    const oThis = this;

    let tokenCache = new TokenByClientIdCache({
      clientId: oThis.clientId
    });

    let response = await tokenCache.fetch();
    if (!response.data) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_sse_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            clientId: oThis.clientId
          }
        })
      );
    }

    let templateName =
      oThis.setupStatus === 1
        ? pepoCampaignsConstants.platformTokenSetupStatusSuccessTemplate
        : pepoCampaignsConstants.platformTokenSetupStatusFailedTemplate;

    await new SendTransactionalMail({
      receiverEntityId: oThis.clientId,
      receiverEntityKind: emailServiceConstants.clientReceiverEntityKind,
      templateName: templateName,
      templateVars: {
        subject_prefix: basicHelper.isSandboxSubEnvironment() ? 'OST Platform Sandbox' : 'OST Platform',
        url_prefix: environmentConstants.urlPrefix,
        [pepoCampaignsConstants.tokenName]: response.data.name,
        token_id: response.data.id
      }
    }).perform();

    oThis.tokenName = response.data.name;

    await oThis._createTokenSetupHook();

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskDone
    });
  }

  /**
   * Create token setup hook
   *
   * @return {Promise<void>}
   * @private
   */
  async _createTokenSetupHook() {
    const oThis = this;

    if (oThis.setupStatus !== 1) {
      return responseHelper.successWithData({});
    }

    let customAttributes = {
      [pepoCampaignsConstants.tokenSetupAttribute]: pepoCampaignsConstants.attributeSet,
      [pepoCampaignsConstants.tokenName]: oThis.tokenName
    };

    let clientMileStoneHook = new ClientMileStoneHook({
      receiverEntityId: oThis.clientId,
      receiverEntityKind: emailServiceConstants.clientReceiverEntityKind,
      customAttributes: customAttributes,
      userSettings: {},
      mileStone: pepoCampaignsConstants.tokenSetupAttribute,
      tokenId: oThis.tokenId
    });

    await clientMileStoneHook.perform();
  }
}

module.exports = SendTokenSetupStatusEmail;
