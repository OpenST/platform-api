/**
 *  Fetch device details by userId and recovery owner address.
 *
 * @module app/services/recoveryOwner/get/ByRecoveryOwnerAddress
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chain/PreviousOwnersMap');
require(rootPrefix + '/lib/cacheManagement/chainMulti/RecoveryOwnerDetail');

class ByRecoveryOwnerAddress extends ServiceBase {
  /**
   * Constructor to get devices data by userId and wallet addresses.
   *
   * @param {Object} params
   * @param {Integer} params.client_id
   * @param {String} params.user_id: uuid
   * @param {String} params.recovery_owner_address: recoveryOwnerAddress
   * @param {Integer} [params.token_id]: tokenId
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.userId = params.user_id;
    oThis.tokenId = params.token_id;
    oThis.recoveryOwnerAddress = params.recovery_owner_address;
  }

  /**
   * Async performer
   *
   * @returns {Promise<*|result>}
   */
  async _asyncPerform() {
    const oThis = this;

    oThis._sanitizeParams();

    if (!oThis.tokenId) {
      await oThis._fetchTokenDetails();
    }

    const returnData = await oThis._getRecoveryOwnerDataFromCache();

    return responseHelper.successWithData(returnData);
  }

  /**
   * Validate and sanitize input parameters.
   *
   * @returns {*}
   *
   * @private
   */
  _sanitizeParams() {
    const oThis = this;

    oThis.recoveryOwnerAddress = oThis.recoveryOwnerAddress.toLowerCase();
  }

  /**
   * Fetch linked device addresses for specified user id.
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _fetchLinkedDeviceAddressMap() {
    const oThis = this;

    const PreviousOwnersMapCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'PreviousOwnersMap'),
      previousOwnersMapObj = new PreviousOwnersMapCache({ userId: oThis.userId, tokenId: oThis.tokenId }),
      previousOwnersMapRsp = await previousOwnersMapObj.fetch();

    if (previousOwnersMapRsp.isFailure()) {
      logger.error('Error in fetching linked addresses.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_ro_g_broa_1',
          api_error_identifier: 'cache_issue',
          debug_options: {}
        })
      );
    }

    return previousOwnersMapRsp.data;
  }

  /**
   * Get recovery owner data from cache.
   *
   * @returns {Promise<*|result>}
   */
  async _getRecoveryOwnerDataFromCache() {
    const oThis = this;

    const RecoveryOwnerDetailCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'RecoveryOwnerDetailCache'),
      recoveryOwnerDetailCache = new RecoveryOwnerDetailCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        recoveryOwnerAddresses: [oThis.recoveryOwnerAddress]
      }),
      response = await recoveryOwnerDetailCache.fetch();

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    if (!CommonValidators.validateObject(response.data[oThis.recoveryOwnerAddress])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_ro_g_broa_2',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['invalid_recovery_owner_address'],
          debug_options: {}
        })
      );
    }

    const finalResponse = response.data[oThis.recoveryOwnerAddress],
      linkedAddressMap = await oThis._fetchLinkedDeviceAddressMap();

    finalResponse.linkedAddress = linkedAddressMap[oThis.recoveryOwnerAddress];

    return {
      [resultType.recoveryOwner]: finalResponse
    };
  }
}

InstanceComposer.registerAsShadowableClass(
  ByRecoveryOwnerAddress,
  coreConstants.icNameSpace,
  'GetRecoveryOwnerAddress'
);

module.exports = {};
