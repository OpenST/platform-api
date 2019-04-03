/**
 * Token setup status email
 *
 * @module lib/stakeAndMint/brandedToken/StatusEmail
 */
const rootPrefix = '../../..',
  TokenByClientIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  SendTransactionalMail = require(rootPrefix + '/lib/email/hookCreator/SendTransactionalMail'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  pepoCampaignsConstants = require(rootPrefix + '/lib/globalConstant/pepoCampaigns'),
  emailServiceConstants = require(rootPrefix + '/lib/globalConstant/emailServiceApiCallHooks');

class SendStakeAndMintStatusEmail {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;

    oThis.clientId = params.clientId;
    oThis.setupStatus = params.setupStatus;
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
        ? pepoCampaignsConstants.platformStakeAndMintStatusSuccessTemplate
        : pepoCampaignsConstants.platformStakeAndMintStatusFailedTemplate;

    await new SendTransactionalMail({
      receiverEntityId: oThis.clientId,
      receiverEntityKind: emailServiceConstants.clientReceiverEntityKind,
      templateName: templateName,
      templateVars: {
        sub_env: coreConstants.subEnvironment,
        token_name: response.data.name
      }
    }).perform();
  }
}

module.exports = SendStakeAndMintStatusEmail;
