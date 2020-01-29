/**
 * Module to create user entity.
 *
 * @module lib/webhooks/delegator/user
 */

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  webhookSubscriptionConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/services/user/get/ById');

/**
 * Class to create user entity.
 *
 * @class User
 */
class User {
  /**
   * Main performer for class.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
   * @param {object} ic
   *
   * @returns {Promise|*|undefined|Promise<T | never>}
   */
  perform(payload, ic) {
    const oThis = this;

    return oThis._asyncPerform(payload, ic).catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('lib/webhooks/delegator/user.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_w_d_u_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async perform.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
   * @param {object} ic
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform(payload, ic) {
    const oThis = this;

    const GetUserById = ic.getShadowedClassFor(coreConstants.icNameSpace, 'GetUser'),
      getUserById = new GetUserById({
        client_id: payload.clientId,
        token_id: payload.tokenId,
        user_id: payload.userId
      });

    const userResponse = await getUserById.perform();

    const rawEntity = userResponse.data[resultType.user];

    await oThis._validateEntityStatus(payload.webhookKind, rawEntity);

    return responseHelper.successWithData({
      entityResultType: resultType.user,
      rawEntity: rawEntity
    });
  }

  /**
   * Webhook subscription topic to entity statuses map.
   */
  get WebhookTopicToEntityStatusMap() {
    return {
      [webhookSubscriptionConstants.usersActivationInitiateTopic]: [tokenUserConstants.activatingStatus],
      [webhookSubscriptionConstants.usersActivationSuccessTopic]: [tokenUserConstants.activatedStatus],
      [webhookSubscriptionConstants.usersActivationFailureTopic]: [tokenUserConstants.createdStatus]
    };
  }

  /**
   * Validate entity status with respect to webhook to be sent.
   *
   * @param webhookKind
   * @param rawEntity
   * @returns {Promise<*>}
   * @private
   */
  async _validateEntityStatus(webhookKind, rawEntity) {
    const oThis = this;

    if (oThis._filteredEntityToSend(webhookKind, rawEntity)) {
      return rawEntity;
    } else {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_w_d_u_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            msg: 'Webhook Kind to send is not in sync with entity data.',
            entityData: rawEntity,
            webhookKind: webhookKind
          }
        })
      );
    }
  }

  /**
   * Filter Entity which can be sent outside.
   *
   * @param webhookKind
   * @param rawEntity
   * @returns {boolean}
   * @private
   */
  _filteredEntityToSend(webhookKind, rawEntity) {
    const oThis = this;

    const allowedEntityStatuses = oThis.WebhookTopicToEntityStatusMap[webhookKind];
    if (allowedEntityStatuses.indexOf(rawEntity.status) <= -1) {
      // Check if entity status is already progressed from desired ones if yes then send webhook
      // eg: 'transactions/initiate' can send Success or Failure status entity,
      // but 'transactions/success' cannot send created status entity.
      if (webhookKind == webhookSubscriptionConstants.usersActivationInitiateTopic) {
        // Check if status has progressed
        if ([tokenUserConstants.activatedStatus, tokenUserConstants.createdStatus].indexOf(rawEntity.status) <= -1) {
          return false;
        } else {
          // Entity can be sent, now filter out data which is not allowed to be sent now
          Object.assign(rawEntity, {
            tokenHolderAddress: null,
            multisigAddress: null,
            recoveryOwnerAddress: null,
            recoveryAddress: null,
            status: tokenUserConstants.activatingStatus
          });
        }
      } else {
        return false;
      }
    }
    return true;
  }
}

module.exports = new User();
