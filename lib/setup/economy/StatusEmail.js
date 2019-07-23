/**
 * Token setup status email
 *
 * @module lib/setup/economy/StatusEmail
 */
const rootPrefix = '../../..',
  TokenByClientIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  SendTransactionalMail = require(rootPrefix + '/lib/email/hookCreator/SendTransactionalMail'),
  ClientMileStoneHook = require(rootPrefix + '/lib/email/hookCreator/ClientMileStone'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  environmentConstants = require(rootPrefix + '/lib/globalConstant/environmentInfo'),
  pepoCampaignsConstants = require(rootPrefix + '/lib/globalConstant/pepoCampaigns'),
  environmentInfo = require(rootPrefix + '/lib/globalConstant/environmentInfo'),
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

    await oThis._fetchTokenAddressDetails();

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
        company_web_domain: coreConstants.SA_CW_DOMAIN,
        view_link: oThis.viewLink
      }
    }).perform();

    oThis.tokenName = response.data.name;

    await oThis._createTokenSetupHook();

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskDone
    });
  }

  /**
   * Fetch utility branded token contract address
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchTokenAddressDetails() {
    const oThis = this;

    let tokenAddressCache = new TokenAddressCache({ tokenId: oThis.tokenId });

    let cacheRsp = await tokenAddressCache.fetch();

    if (cacheRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_sse_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.utilityBrandedTokenAddress = cacheRsp.data[tokenAddressConstants.utilityBrandedTokenContract];

    oThis.viewLink = `${coreConstants.SA_VIEW_BASE_URL}${environmentInfo.urlPrefix}/token/ec-${oThis.auxChainId}-${
      oThis.utilityBrandedTokenAddress
    }`;
  }

  /**
   * Create token setup hook
   *
   * @return {Promise<void>}
   * @private
   */
  async _createTokenSetupHook() {
    const oThis = this;

    let customAttributes = {
      [pepoCampaignsConstants.tokenSetupAttribute]: pepoCampaignsConstants.attributeSet,
      [pepoCampaignsConstants.tokenName]: oThis.tokenName
    };

    if (basicHelper.isSandboxSubEnvironment() && oThis.setupStatus == 1) {
      customAttributes[pepoCampaignsConstants.testnetViewLink] = `${coreConstants.SA_VIEW_BASE_URL}testnet/token/ec-${
        oThis.auxChainId
      }-${oThis.utilityBrandedTokenAddress}`;
    }

    let clientMileStoneHook = new ClientMileStoneHook({
      receiverEntityId: oThis.clientId,
      receiverEntityKind: emailServiceConstants.clientReceiverEntityKind,
      customAttributes: customAttributes,
      userSettings: {},
      mileStone: pepoCampaignsConstants.tokenSetupAttribute
    });

    await clientMileStoneHook.perform();
  }
}

module.exports = SendTokenSetupStatusEmail;
