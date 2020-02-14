/**
 * Base module for user recovery operations.
 *
 * @module app/services/user/recovery/Base
 */

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  UserRecoveryOperationsCache = require(rootPrefix + '/lib/cacheManagement/shared/UserPendingRecoveryOperations'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  signatureVerification = require(rootPrefix + '/lib/validators/Sign'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/models/ddb/sharded/Device');
require(rootPrefix + '/lib/cacheManagement/chain/PreviousOwnersMap');
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Base class for user recovery operations.
 *
 * @class UserRecoveryBase
 */
class UserRecoveryBase extends ServiceBase {
  /**
   * Constructor for user recovery operations.
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {number} params.token_id
   * @param {string} params.user_id
   * @param {string} params.old_linked_address
   * @param {string} params.old_device_address
   * @param {string} params.new_device_address
   * @param {string} params.new_recovery_owner_address
   * @param {string} params.to: Transaction to address, user recovery proxy address
   * @param {string} params.signature: Packed signature data ({bytes32 r}{bytes32 s}{uint8 v})
   * @param {string} params.signer: recovery owner address who signed this transaction
   *
   * @augments ServiceBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;
    oThis.userId = params.user_id;
    oThis.oldLinkedAddress = params.old_linked_address || '';
    oThis.oldDeviceAddress = params.old_device_address || '';
    oThis.newDeviceAddress = params.new_device_address || '';
    oThis.newRecoveryOwnerAddress = params.new_recovery_owner_address || '';
    oThis.recoveryContractAddress = params.to;
    oThis.signature = params.signature;
    oThis.signer = params.signer;

    oThis.userData = null;
    oThis.deviceShardNumber = null;
    oThis.auxChainId = null;
    oThis.web3InstanceObj = null;
    oThis.configStrategyObj = null;
    oThis.newDeviceAddressEntity = {};
    oThis.userPendingRecoveryOperations = [];
  }

  /**
   * Async perform.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._sanitizeParams();

    await oThis._fetchUserDetails();

    await oThis._basicValidations();

    await oThis._fetchUserPendingRecoveryOperations();

    await oThis._canPerformRecoveryOperation();

    await oThis._validateAddressStatuses();

    await oThis._performRecoveryOperation();

    return oThis._returnResponse();
  }

  /**
   * Sanitize input parameters.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _sanitizeParams() {
    const oThis = this;

    oThis.oldLinkedAddress = basicHelper.sanitizeAddress(oThis.oldLinkedAddress);
    oThis.oldDeviceAddress = basicHelper.sanitizeAddress(oThis.oldDeviceAddress);
    oThis.newDeviceAddress = basicHelper.sanitizeAddress(oThis.newDeviceAddress);
    oThis.newRecoveryOwnerAddress = basicHelper.sanitizeAddress(oThis.newRecoveryOwnerAddress);
    oThis.recoveryContractAddress = basicHelper.sanitizeAddress(oThis.recoveryContractAddress);
    oThis.signer = basicHelper.sanitizeAddress(oThis.signer);

    oThis.auxChainId = oThis._configStrategyObject.auxChainId;
  }

  /**
   * Fetch user details.
   *
   * @sets oThis.userData, oThis.deviceShardNumber
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchUserDetails() {
    const oThis = this;

    const TokenUSerDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUSerDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] }),
      cacheFetchRsp = await tokenUserDetailsCacheObj.fetch();

    if (!CommonValidators.validateObject(cacheFetchRsp.data[oThis.userId])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_b_1',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['user_not_found'],
          debug_options: {}
        })
      );
    }

    oThis.userData = cacheFetchRsp.data[oThis.userId];
    oThis.deviceShardNumber = oThis.userData.deviceShardNumber;
  }

  /**
   * Perform basic validations on user data before recovery procedures.
   *
   * @returns {Promise<Void>}
   * @private
   */
  async _basicValidations() {
    const oThis = this;

    // User is activated or not.
    if (oThis.userData.status !== tokenUserConstants.activatedStatus) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_b_2',
          api_error_identifier: 'user_not_activated',
          debug_options: {}
        })
      );
    }

    // Signer cannot be different from recovery owner.
    if (oThis.userData.recoveryOwnerAddress !== oThis.signer) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_b_3',
          api_error_identifier: 'invalid_params',
          params_error_identifiers: ['invalid_signer'],
          debug_options: {}
        })
      );
    }

    // Validate user recovery contract address is same as input.
    if (oThis.userData.recoveryAddress !== oThis.recoveryContractAddress) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_b_4',
          api_error_identifier: 'invalid_params',
          params_error_identifiers: ['invalid_to'],
          debug_options: {}
        })
      );
    }

    // Signature is valid or not.
    await oThis._validateSignature();
  }

  /**
   * Validate signature.
   *
   * @return {Promise<never>}
   * @private
   */
  async _validateSignature() {
    const oThis = this,
      typedData = oThis._createTypedData();

    const verifySignRsp = await signatureVerification.validateSignature(
      typedData.getEIP712SignHash(),
      oThis.signature,
      oThis.signer
    );

    if (!verifySignRsp.isValid) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_b_5',
          api_error_identifier: 'invalid_params',
          params_error_identifiers: ['invalid_signature'],
          debug_options: {}
        })
      );
    }
  }

  /**
   * Fetch pending recovery operations of user if any.
   *
   * @sets oThis.userPendingRecoveryOperations
   *
   * @returns {Promise<Void>}
   * @private
   */
  async _fetchUserPendingRecoveryOperations() {
    const oThis = this;

    const recoveryOperationsResp = await new UserRecoveryOperationsCache({
      tokenId: oThis.tokenId,
      userId: oThis.userId
    }).fetch();

    if (recoveryOperationsResp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_b_6',
          api_error_identifier: 'cache_issue',
          debug_options: {}
        })
      );
    }

    oThis.userPendingRecoveryOperations = recoveryOperationsResp.data.recoveryOperations || [];
  }

  /**
   * Get typed data.
   *
   * @return {TypedData}
   * @private
   */
  _createTypedData() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Validate old linked address from input with contract.
   *
   * @returns {Promise<Void>}
   * @private
   */
  async _validateOldLinkedAddress() {
    const oThis = this;

    const linkedAddressesMap = await oThis._fetchUserAddressesLink();

    if (!CommonValidators.validateObject(linkedAddressesMap)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_b_7',
          api_error_identifier: 'could_not_proceed',
          debug_options: {}
        })
      );
    }

    // Validate old linked address from input is same as one found from contract.
    if (
      !linkedAddressesMap[oThis.oldDeviceAddress] ||
      linkedAddressesMap[oThis.oldDeviceAddress].toLowerCase() !== oThis.oldLinkedAddress
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_b_8',
          api_error_identifier: 'invalid_params',
          params_error_identifiers: ['invalid_old_linked_address'],
          debug_options: {}
        })
      );
    }
  }

  /**
   * Fetch linked addresses map of user.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchUserAddressesLink() {
    const oThis = this;

    const PreviousOwnersMapCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'PreviousOwnersMap'),
      previousOwnersMapObj = new PreviousOwnersMapCache({ userId: oThis.userId, tokenId: oThis.tokenId }),
      previousOwnersMapRsp = await previousOwnersMapObj.fetch();

    if (previousOwnersMapRsp.isFailure()) {
      logger.error('Error in fetching linked addresses');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_b_9',
          api_error_identifier: 'cache_issue',
          debug_options: {}
        })
      );
    }

    return previousOwnersMapRsp.data;
  }

  /**
   * Fetch devices from cache.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchDevices() {
    const oThis = this;

    const DeviceDetailCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache'),
      deviceDetailCache = new DeviceDetailCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        walletAddresses: [oThis.oldDeviceAddress, oThis.newDeviceAddress],
        shardNumber: oThis.userData.deviceShardNumber
      }),
      response = await deviceDetailCache.fetch();

    if (response.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_b_10',
          api_error_identifier: 'cache_issue',
          debug_options: {}
        })
      );
    }

    return response.data;
  }

  /**
   * Change device statuses.
   *
   * @param {object} statusMap
   *
   * @returns {Promise<Array>}
   * @private
   */
  async _changeDeviceStatuses(statusMap) {
    const oThis = this,
      DeviceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel');

    const promiseArray = [],
      deviceEntities = [];
    let ddbQueryFailed = false;

    for (const address in statusMap) {
      const initialStatus = statusMap[address].initial,
        finalStatus = statusMap[address].final,
        deviceModelObj = new DeviceModel({ shardNumber: oThis.userData.deviceShardNumber });

      promiseArray.push(
        new Promise(function(onResolve, onReject) {
          deviceModelObj
            .updateStatusFromInitialToFinal(oThis.userId, address, initialStatus, finalStatus)
            .then(function(resp) {
              deviceEntities.push(resp.data);
              if (resp.isFailure()) {
                ddbQueryFailed = true;
              }
              onResolve();
            })
            .catch(function(error) {
              logger.error(error);
              ddbQueryFailed = true;
              onResolve();
            });
        })
      );
    }

    await Promise.all(promiseArray);

    // If ddb query is failed. Then reject initiate recovery request.
    if (ddbQueryFailed) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_b_11',
          api_error_identifier: 'action_not_performed_contact_support',
          debug_options: {}
        })
      );
    }

    return deviceEntities;
  }

  /**
   * Config strategy.
   *
   * @return {object}
   */
  get _configStrategy() {
    const oThis = this;

    return oThis.ic().configStrategy;
  }

  /**
   * Object of config strategy class.
   *
   * @return {object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) {
      return oThis.configStrategyObj;
    }

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }

  /**
   * Get web3instance to interact with chain.
   *
   * @sets oThis.web3InstanceObj
   *
   * @return {object}
   */
  get _web3Instance() {
    const oThis = this;

    if (oThis.web3InstanceObj) {
      return oThis.web3InstanceObj;
    }

    const chainEndPoint = oThis._configStrategyObject.auxChainWsProvider(configStrategyConstants.gethReadWrite);
    oThis.web3InstanceObj = web3Provider.getInstance(chainEndPoint).web3WsProvider;

    return oThis.web3InstanceObj;
  }

  /**
   * Check if recovery operation can be performed or not.
   *
   * @return {Promise<void>}
   * @private
   */
  async _canPerformRecoveryOperation() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Validate input addresses with devices or recovery owners based on service.
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateAddressStatuses() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Perform recovery operation for user.
   *
   * @returns {Promise<Array>}
   * @private
   */
  async _performRecoveryOperation() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Return required response as per the service.
   *
   * @returns {Promise<>}
   * @private
   */
  async _returnResponse() {
    throw new Error('Sub-class to implement.');
  }
}

module.exports = UserRecoveryBase;
