/**
 * This module helps in Validating user transaction redemption request
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  UserRedemptionModel = require(rootPrefix + '/app/models/mysql/UserRedemption'),
  AddressesEncryptor = require(rootPrefix + '/lib/encryptors/AddressesEncryptor'),
  userRedemptionConstants = require(rootPrefix + '/lib/globalConstant/userRedemption'),
  SlackRedemptionMsg = require(rootPrefix + '/executables/SlackNewRedemptionMessage'),
  publishToPreProcessor = require(rootPrefix + '/lib/webhooks/publishToPreProcessor'),
  TokenByTokenIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenByTokenId'),
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenRedemptionProduct');
require(rootPrefix + '/lib/cacheManagement/chainMulti/UserRedemptionsByUuid');
require(rootPrefix + '/lib/cacheManagement/chain/UserSaltEncryptorKey');

/**
 * Class to accept user redemption requests, post transaction finalize.
 *
 * @class AcceptUserRedemptionRequest
 */
class AcceptUserRedemptionRequest {
  /**
   * Constructor to accept user redemption requests.
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;
    oThis.chainId = params.chainId;
    oThis.userRedemptionUuids = params.userRedemptionUuids;
    oThis.transactionInfoMap = params.transactionInfoMap;

    oThis.userRedemptions = {};
    oThis.redemptionProducts = {};
    oThis.tokens = {};
    oThis.tokenEncryptionSalt = {};
  }

  /**
   * Main Performer
   *
   * @returns {Promise<*|result>}
   */
  async perform() {
    const oThis = this;

    await oThis._init();

    await oThis._fetchUserRedemptions();

    await oThis._markRedemptionAsAccepted();

    await oThis._fetchTokenAndProductsDetails();

    let promises = [];
    promises.push(oThis._sendSlackNotifications());
    promises.push(oThis._sendWebhooks());

    await Promise.all(promises);
  }

  /**
   * Init
   *
   * @returns {Promise<never>}
   * @private
   */
  async _init() {
    const oThis = this;

    // Fetch config strategy for the aux chain
    const strategyByChainHelperObj = new StrategyByChainHelper(oThis.chainId),
      configStrategyResp = await strategyByChainHelperObj.getComplete();

    // if config strategy fetch failed, then emit SIGINT
    if (configStrategyResp.isFailure()) {
      return Promise.reject('Could not load config strategy.');
    }

    const configStrategy = configStrategyResp.data;

    // Creating ic object using the config strategy
    oThis.ic = new InstanceComposer(configStrategy);
  }

  /**
   * Fetch User Redemptions
   *
   * @returns {Promise<never>}
   * @private
   */
  async _fetchUserRedemptions() {
    const oThis = this;

    const cacheKlass = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'UserRedemptionsByUuid'),
      cacheResp = await new cacheKlass({ uuids: oThis.userRedemptionUuids }).fetch();

    if (cacheResp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_r_ur_a_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { err: 'Invalid Cache' }
        })
      );
    }

    oThis.userRedemptions = cacheResp.data;
  }

  /**
   * Mark Redemptions as Accepted
   *
   * @returns {Promise<never>}
   * @private
   */
  async _markRedemptionAsAccepted() {
    const oThis = this;

    let uuidsAccepted = [];
    for (let uuid in oThis.userRedemptions) {
      if (
        !oThis.userRedemptions[uuid] ||
        oThis.userRedemptions[uuid].status != userRedemptionConstants.redemptionProcessingStatus
      ) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_r_ur_a_2',
            api_error_identifier: 'something_went_wrong',
            debug_options: { err: 'Invalid Cache' }
          })
        );
      }
      uuidsAccepted.push(uuid);
    }

    await new UserRedemptionModel({})
      .update({
        status: userRedemptionConstants.invertedStatuses[userRedemptionConstants.redemptionAcceptedStatus]
      })
      .where({ uuid: uuidsAccepted })
      .fire();

    const cacheKlass = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'UserRedemptionsByUuid');
    await new cacheKlass({ uuids: oThis.userRedemptionUuids }).clear();
  }

  /**
   * Fetch Redemption token and product details
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchTokenAndProductsDetails() {
    const oThis = this;

    let productIds = [];
    for (let uuid in oThis.userRedemptions) {
      productIds.push(oThis.userRedemptions[uuid].tokenRedemptionProductId);
    }

    const cacheKlass = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenRedemptionProductCache'),
      productsResp = await new cacheKlass({ ids: productIds }).fetch();

    oThis.redemptionProducts = productsResp.data;

    let tokenIds = [];
    for (let uuid in oThis.userRedemptions) {
      const productId = oThis.userRedemptions[uuid].tokenRedemptionProductId,
        tokenId = oThis.redemptionProducts[productId].tokenId;

      tokenIds.push(tokenId);
      oThis.userRedemptions[uuid].tokenId = tokenId;
    }

    let promisesArray = [];
    for (let i = 0; i < tokenIds.length; i++) {
      promisesArray.push(oThis._fetchToken(tokenIds[i]));
      promisesArray.push(oThis._fetchTokenEncryptionSalt(tokenIds[i]));
    }
    await Promise.all(promisesArray);

    await oThis._decryptEmail();
  }

  async _decryptEmail() {
    const oThis = this;

    for (let uuid in oThis.userRedemptions) {
      let userRedemption = oThis.userRedemptions[uuid];

      if (userRedemption.emailAddress) {
        const encryptionSalt = oThis.tokenEncryptionSalt[userRedemption.tokenId];

        userRedemption.emailAddress = await new AddressesEncryptor({ encryptionSaltD: encryptionSalt }).decrypt(
          userRedemption.emailAddress
        );
      }
    }
  }

  /**
   * Fetch Token Details
   *
   * @param tokenId
   * @returns {Promise<void>}
   * @private
   */
  async _fetchToken(tokenId) {
    const oThis = this;

    const cacheResp = await new TokenByTokenIdCache({ tokenId: tokenId }).fetch(),
      clientId = cacheResp.data.clientId,
      tokenCacheResp = await new TokenCache({ clientId: clientId }).fetch();

    oThis.tokens[tokenId] = tokenCacheResp.data;
  }

  /**
   * fetch encryption salts.
   *
   * @param tokenId
   * @returns {Promise<void>}
   * @private
   */
  async _fetchTokenEncryptionSalt(tokenId) {
    const oThis = this;

    const UserSaltEncryptorKeyCache = oThis.ic.getShadowedClassFor(
        coreConstants.icNameSpace,
        'UserSaltEncryptorKeyCache'
      ),
      encryptionSaltResp = await new UserSaltEncryptorKeyCache({ tokenId: tokenId }).fetchDecryptedData();

    oThis.tokenEncryptionSalt[tokenId] = encryptionSaltResp.data.encryption_salt_d;
  }

  /**
   * Send Webhooks
   *
   * @returns {Promise<void>}
   * @private
   */
  async _sendWebhooks() {
    const oThis = this;

    let promises = [];
    for (let uuid in oThis.userRedemptions) {
      const payload = {
        userId: oThis.userRedemptions[uuid].userUuid,
        webhookKind: webhookSubscriptionsConstants.redemptionAcceptedTopic,
        clientId: oThis.tokens[oThis.userRedemptions[uuid].tokenId].clientId,
        userRedemptionUuid: uuid
      };

      promises.push(publishToPreProcessor.perform(oThis.chainId, payload));
    }

    await Promise.all(promises);
  }

  /**
   * Send Notifications to admin on slack
   *
   * @returns {Promise<void>}
   * @private
   */
  async _sendSlackNotifications() {
    const oThis = this;

    let promises = [];
    for (let uuid in oThis.userRedemptions) {
      const payload = {
        email: oThis.userRedemptions[uuid].emailAddress,
        tokenName: oThis.tokens[oThis.userRedemptions[uuid].tokenId].name,
        userId: oThis.userRedemptions[uuid].userUuid,
        amount: oThis.userRedemptions[uuid].amount,
        redemptionId: uuid,
        clientId: oThis.tokens[oThis.userRedemptions[uuid].tokenId].clientId,
        productName: oThis.redemptionProducts[oThis.userRedemptions[uuid].tokenRedemptionProductId].name,
        country: oThis.userRedemptions[uuid].countryIsoCode,
        currency: oThis.userRedemptions[uuid].currencyIsoCode
      };
      if (oThis.transactionInfoMap[uuid]) {
        payload.tokenHolderAddressLink = oThis.transactionInfoMap[uuid].userTokenHolder;
        payload.transactionViewLink = oThis.transactionInfoMap[uuid].transactionHash;
      }

      promises.push(new SlackRedemptionMsg(payload).perform());
    }

    await Promise.all(promises);
  }
}

module.exports = AcceptUserRedemptionRequest;
