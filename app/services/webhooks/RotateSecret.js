/**
 * Module to create new webhook.
 *
 * @module app/services/webhooks/modify/Create
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  WebhookEndpointModel = require(rootPrefix + '/app/models/mysql/WebhookEndpoint'),
  WebhookEndpointsByUuidCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/WebhookEndpointsByUuid'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  KmsWrapper = require(rootPrefix + '/lib/authentication/KmsWrapper'),
  util = require(rootPrefix + '/lib/util'),
  ApiCredentialModel = require(rootPrefix + '/app/models/mysql/ApiCredential'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher');

const GRACE_EXPIRY_DELTA = 24 * 60 * 60; // 24 hours for grace expiry
/**
 * Class to create new webhook.
 *
 * @class RotateWebhookSecret
 */
class RotateWebhookSecret extends ServiceBase {
  /**
   * Constructor to create new webhook.
   *
   * @param {object} params
   * @param {number} params.client_id: client id
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.clientId = params.client_id;

    oThis.clientEndpointUuids = [];
    oThis.secret = null;
    oThis.newSecret = null;
    oThis.graceExpiryAt = null;
  }

  /**
   * Async perform: Perform webhook creation.
   *
   * @return {Promise}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._getClientEndpoints();

    await oThis._generateNewSecret();

    await oThis._rotateGraceSecret();

    await oThis._clearCache();

    return responseHelper.successWithData({});
  }

  /**
   * Get All endpoints of client
   *
   * @returns {Promise}
   * @private
   */
  async _getClientEndpoints() {
    const oThis = this;

    const endpoints = await new WebhookEndpointModel()
      .select('*')
      .where({ client_id: oThis.clientId })
      .fire();

    if (endpoints.length <= 0) {
      return responseHelper.error({
        internal_error_identifier: 'a_s_w_rs_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: { clientId: oThis.clientId }
      });
    }

    for (let i = 0; i < endpoints.length; i++) {
      oThis.clientEndpointUuids.push(endpoints[i].uuid);
    }

    oThis.secret = endpoints[0].secret;
    oThis.secretSalt = endpoints[0].secret_salt;
    oThis.graceExpiryAt = basicHelper.getCurrentTimestampInSeconds() + GRACE_EXPIRY_DELTA;

    return responseHelper.successWithData({});
  }

  /**
   * Generate new secret
   *
   * @returns {Promise}
   * @private
   */
  async _generateNewSecret() {
    const oThis = this;

    const KMSObject = new KmsWrapper(ApiCredentialModel.encryptionPurpose),
      decryptedSecretSalt = await KMSObject.decrypt(oThis.secretSalt),
      secretSalt = decryptedSecretSalt.Plaintext;

    const apiSecret = util.generateWebhookSecret();
    oThis.newSecret = localCipher.encrypt(secretSalt, apiSecret);

    return responseHelper.successWithData({});
  }

  /**
   * rotate grace secret
   *
   * @returns {Promise}
   * @private
   */
  async _rotateGraceSecret() {
    const oThis = this;

    if (!oThis.newSecret || !oThis.secretSalt) {
      return responseHelper.error({
        internal_error_identifier: 'a_s_w_rs_2',
        api_error_identifier: 'something_went_wrong',
        debug_options: { clientId: oThis.clientId }
      });
    }

    await new WebhookEndpointModel()
      .update({
        secret: oThis.newSecret,
        grace_secret: oThis.secret,
        secret_salt: oThis.secretSalt,
        grace_expiry_at: oThis.graceExpiryAt
      })
      .where({ client_id: oThis.clientId })
      .fire();

    return responseHelper.successWithData({});
  }

  /**
   * Clear cache.
   *
   * @returns {Promise}
   * @private
   */
  async _clearCache() {
    const oThis = this;

    // Clear webhook endpoints cache.
    await new WebhookEndpointsByUuidCache({ webhookEndpointUuids: oThis.clientEndpointUuids }).clear();
  }
}

InstanceComposer.registerAsShadowableClass(
  RotateWebhookSecret,
  coreConstants.icNameSpace,
  'RotateWebhookSecretInternal'
);

module.exports = {};
