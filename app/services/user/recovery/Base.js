/**
 *  Base for user recovery operations.
 *
 * @module app/services/user/recovery/Base
 */

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  signatureVerification = require(rootPrefix + '/lib/validators/Sign'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/Device');
require(rootPrefix + '/lib/cacheManagement/chain/PreviousOwnersMap');
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Class for user recovery operations.
 *
 * @class UserRecoveryBase
 */
class UserRecoveryBase extends ServiceBase {
  /**
   * Constructor for user recovery operations.
   *
   * @param {Object} params
   * @param {Number} params.client_id
   * @param {Number} params.token_id
   * @param {String} params.user_id
   * @param {String} params.old_linked_address
   * @param {String} params.old_device_address
   * @param {String} params.new_device_address
   * @param {String} params.new_recovery_owner_address
   * @param {String} params.to: Transaction to address, user recovery proxy address
   * @param {String} params.signature: Packed signature data ({bytes32 r}{bytes32 s}{uint8 v})
   * @param {String} params.signer: recovery owner address who signed this transaction
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
  }

  /**
   * Async perform
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._sanitizeParams();

    await oThis._fetchUserDetails();

    await oThis._basicValidations();

    await oThis._canPerformRecoveryOperation();

    await oThis._validateAddressStatuses();

    await oThis._performRecoveryOperation();

    return await oThis._returnResponse();
  }

  /**
   * Sanitize Params
   *
   * @returns {Promise<void>}
   *
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

    // TODO: EC recover signature.
  }

  /**
   * Fetch user details
   *
   * @returns {Promise<void>}
   *
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
   *
   * @private
   */
  async _basicValidations() {
    const oThis = this;

    // User is activated or not
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
          params_error_identifiers: ['invalid_signer_address'],
          debug_options: {}
        })
      );
    }

    // Validate user recovery contract address is same as input
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
   *
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
   * Get typed data.
   *
   * @return {TypedData}
   *
   * @private
   */
  _createTypedData() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Validate old linked address from input with contract
   *
   * @returns {Promise<Void>}
   *
   * @private
   */
  async _validateOldLinkedAddress() {
    const oThis = this;

    const linkedAddressesMap = await oThis._fetchUserAddressesLink();

    if (!CommonValidators.validateObject(linkedAddressesMap)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_b_5',
          api_error_identifier: 'could_not_proceed',
          debug_options: {}
        })
      );
    }

    // Validate old linked address from input is same as one found from contract
    if (
      !linkedAddressesMap[oThis.oldDeviceAddress] ||
      linkedAddressesMap[oThis.oldDeviceAddress].toLowerCase() !== oThis.oldLinkedAddress
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_b_6',
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
          internal_error_identifier: 'a_s_u_r_b_7',
          api_error_identifier: 'cache_issue',
          debug_options: {}
        })
      );
    }

    return previousOwnersMapRsp.data;
  }

  /**
   * Check if recovery operation can be performed or not.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _canPerformRecoveryOperation() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Validate input addresses with devices or recovery owners based on service.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _validateAddressStatuses() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Fetch devices from cache.
   *
   * @returns {Promise<*>}
   *
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
          internal_error_identifier: 'a_s_u_r_b_8',
          api_error_identifier: 'cache_issue',
          debug_options: {}
        })
      );
    }

    return response.data;
  }

  /**
   * Perform recovery operation for user.
   *
   * @returns {Promise<Array>}
   *
   * @private
   */
  async _performRecoveryOperation() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Return required response as per the service.
   *
   * @returns {Promise<>}
   *
   * @private
   */
  async _returnResponse() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Change Device statuses.
   *
   * @param {Object} statusMap
   *
   * @returns {Promise<Array>}
   *
   * @private
   */
  async _changeDeviceStatuses(statusMap) {
    const oThis = this,
      DeviceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel');

    const promises = [],
      deviceEntities = [];
    let ddbQueryFailed = false;

    for (let address in statusMap) {
      const initialStatus = statusMap[address].initial,
        finalStatus = statusMap[address].final,
        deviceModelObj = new DeviceModel({ shardNumber: oThis.userData.deviceShardNumber });

      promises.push(
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

    await Promise.all(promises);

    // If ddb query is failed. Then reject initiate recovery request.
    if (ddbQueryFailed) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_b_9',
          api_error_identifier: 'action_not_performed_contact_support',
          debug_options: {}
        })
      );
    }
    return deviceEntities;
  }

  /***
   * Config strategy
   *
   * @return {Object}
   */
  get _configStrategy() {
    const oThis = this;

    return oThis.ic().configStrategy;
  }

  /**
   * Object of config strategy class
   *
   * @return {Object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }

  /**
   * Get web3instance to interact with chain
   *
   * @return {Object}
   */
  get _web3Instance() {
    const oThis = this;

    if (oThis.web3InstanceObj) return oThis.web3InstanceObj;

    const chainEndPoint = oThis._configStrategyObject.auxChainWsProvider(configStrategyConstants.gethReadWrite);
    oThis.web3InstanceObj = web3Provider.getInstance(chainEndPoint).web3WsProvider;

    return oThis.web3InstanceObj;
  }
}

module.exports = UserRecoveryBase;
