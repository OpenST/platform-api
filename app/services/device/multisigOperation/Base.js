'use strict';

/**
 *  Base for device related multi sig operations
 *
 * @module app/services/device/multisigOperation/Base
 */

const OpenStJs = require('@openstfoundation/openst.js'),
  GnosisSafeHelper = OpenStJs.Helpers.GnosisSafe;

const rootPrefix = '../../../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ECRecover = require(rootPrefix + '/app/services/verifySigner/ECRecover'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/device/UpdateStatus');
require(rootPrefix + '/app/models/ddb/sharded/Device');

/**
 * Class for device related multi sig operations
 *
 * @class MultisigOpertationBaseKlass
 */
class MultisigOpertationBaseKlass extends ServiceBase {
  /**
   *
   * @param {Object} params
   * @param {Number} params.client_id
   * @param {Number} params.token_id
   * @param {Object} params.user_data
   *
   * @param {String} params.to - Destination address of Safe transaction, multisig proxy address
   * @param {String/Number} params.value - Ether value of Safe transaction, eth value in wei
   * @param {String} params.calldata - Data payload of Safe transaction
   * @param {Number} params.operation - Operation type of Safe transaction
   * @param {String/Number} params.safe_tx_gas - Gas that should be used for the Safe transaction
   * @param {String/Number} params.data_gas - Gas costs for data used to trigger the safe transaction and to pay the payment transfer
   * @param {String/Number} params.gas_price - Gas price that should be used for the payment calculation
   * @param {String} params.gas_token - Token address (or 0 if ETH) that is used for the payment
   * @param {String} params.refund_receiver - Address of receiver of gas payment (or 0 if tx.origin)
   * @param {String} params.signatures - Packed signature data ({bytes32 r}{bytes32 s}{uint8 v})
   * @param {Array} params.signers - array of authorized device addresses who signed this transaction
   * @param {String/Number} params.nonce - multisig contract nonce
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;
    oThis.userData = params.user_data;
    oThis.userId = params.user_data.userId;
    oThis.deviceShardNumber = params.user_data.deviceShardNumber;
    oThis.multisigAddress = params.user_data.multisigAddress;

    oThis.to = params.to;
    oThis.value = params.value;
    oThis.calldata = params.calldata;
    oThis.operation = params.operation;
    oThis.safeTxGas = params.safe_tx_gas;
    oThis.dataGas = params.data_gas;
    oThis.gasPrice = params.gas_price;
    oThis.gasToken = params.gas_token;
    oThis.refundReceiver = params.refund_receiver;
    oThis.signatures = params.signatures;
    oThis.signers = params.signers;
    oThis.nonce = params.nonce;

    oThis.signer = null;
    oThis.configStrategyObj = null;
    oThis.web3InstanceObj = null;
  }

  /**
   * async perform
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._sanitizeParams();

    await oThis._performCommonPreChecks();

    return oThis._performOperation();
  }

  /**
   *
   * @returns {Promise<void>}
   * @private
   */
  async _sanitizeParams() {
    const oThis = this;

    oThis.to = basicHelper.sanitizeAddress(oThis.to);
    oThis.value = basicHelper.formatWeiToString(oThis.value);
    oThis.operation = Number(oThis.operation);
    oThis.safeTxGas = Number(oThis.safeTxGas);
    oThis.dataGas = Number(oThis.dataGas);
    oThis.gasPrice = basicHelper.formatWeiToString(oThis.gasPrice);
    oThis.gasToken = basicHelper.sanitizeAddress(oThis.gasToken);
    oThis.refundReceiver = basicHelper.sanitizeAddress(oThis.refundReceiver);
    oThis.nonce = Number(oThis.nonce);

    if (oThis.signers.length !== 1 || !CommonValidators.validateEthAddress(oThis.signers[0])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_b_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_signer_address'],
          debug_options: {}
        })
      );
    }

    oThis.signer = basicHelper.sanitizeAddress(oThis.signers[0]);

    // Sanitize action specific params
    await oThis._sanitizeSpecificParams();
  }

  /**
   * 1. status is activated in users table
   * 2. multisig is present for that user
   * 3. token holder is present for that user
   * 4. Kind is user only
   *
   * @returns {Promise<void>}
   * @private
   */
  async _performCommonPreChecks() {
    const oThis = this;

    let tokenUserDetails = oThis.userData;

    //Check if user is activated
    if (
      tokenUserDetails.status !== tokenUserConstants.activatedStatus ||
      !tokenUserDetails.multisigAddress ||
      !tokenUserDetails.tokenHolderAddress ||
      tokenUserDetails.kind !== tokenUserConstants.userKind
    ) {
      logger.error('Token user is not set properly');
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_b_2',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['unauthorized_user_id'],
          debug_options: {}
        })
      );
    }

    //check multisig address
    if (oThis.multisigAddress !== oThis.to) {
      logger.error('Multisig address mismatch');
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_b_3',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_to'],
          debug_options: {}
        })
      );
    }
    //Validates if the signatures provided is valid.
    //await oThis._validateSignature();

    // Perform action specific pre checks
    await oThis._performSpecificPreChecks();

    return responseHelper.successWithData({});
  }

  /**
   * Validate signature
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateSignature() {
    const oThis = this;

    let gnosisSafeProxyInstance = new GnosisSafeHelper(oThis.multisigAddress, oThis._web3Instance),
      safeTxData = gnosisSafeProxyInstance.getSafeTxData(
        oThis.multisigAddress,
        oThis.value,
        oThis.calldata,
        oThis.operation,
        oThis.safeTxGas,
        oThis.dataGas,
        oThis.gasPrice,
        oThis.gasToken,
        oThis.refundReceiver,
        oThis.nonce
      );

    let verifySignRsp = await new ECRecover({
      signer: oThis.signer,
      personal_sign: oThis.signatures,
      message_to_sign: safeTxData
    }).perform();

    if (verifySignRsp.isFailure()) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_b_4',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_signatures'],
          debug_options: {}
        })
      );
    }
  }

  /**
   * Return specific device details
   *
   * @param deviceAddresses
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _fetchDeviceDetails(deviceAddresses) {
    const oThis = this;

    let paramsForDeviceDetailsCache = {
      userId: oThis.userId,
      walletAddresses: deviceAddresses,
      tokenId: oThis.tokenId,
      shardNumber: oThis.deviceShardNumber
    };

    let DeviceDetailsKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache'),
      deviceDetailsObj = new DeviceDetailsKlass(paramsForDeviceDetailsCache),
      deviceDetailsRsp = await deviceDetailsObj.fetch();

    if (deviceDetailsRsp.isFailure()) {
      logger.error('No data found for the provided wallet address');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_dm_mo_b_5',
          api_error_identifier: 'cache_issue',
          debug_options: ''
        })
      );
    }

    return deviceDetailsRsp;
  }

  /**
   * This function updates the device status of the respective record in devices table.
   *
   * @param {String} deviceAddress
   * @param {String} initialDeviceStatus
   * @param {String} finalDeviceStatus
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _updateDeviceStatus(deviceAddress, initialDeviceStatus, finalDeviceStatus) {
    const oThis = this;

    logger.debug('**** Updating device status');
    let paramsToUpdateDeviceStatus = {
      chainId: oThis._configStrategyObject.auxChainId,
      shardNumber: oThis.deviceShardNumber,
      userId: oThis.userId,
      walletAddress: deviceAddress,
      initialStatus: initialDeviceStatus,
      finalStatus: finalDeviceStatus
    };
    let UpdateDeviceStatusKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UpdateDeviceStatus'),
      updateDeviceStatusObj = new UpdateDeviceStatusKlass(paramsToUpdateDeviceStatus),
      updateDeviceStatusRsp = await updateDeviceStatusObj.perform();

    if (updateDeviceStatusRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_dm_mo_b_6',
          api_error_identifier: 'could_not_proceed',
          debug_options: {}
        })
      );
    }

    return updateDeviceStatusRsp;
  }

  /**
   * Get web3instance to interact with chain
   *
   * @return {Object}
   */
  get _web3Instance() {
    const oThis = this;

    if (oThis.web3InstanceObj) return oThis.web3InstanceObj;

    let chainEndPoint = oThis._configStrategyObject.auxChainWsProvider(configStrategyConstants.gethReadWrite);
    oThis.web3InstanceObj = web3Provider.getInstance(chainEndPoint).web3WsProvider;

    return oThis.web3InstanceObj;
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

  /***
   * Config strategy
   *
   * @return {Object}
   */
  get _configStrategy() {
    const oThis = this;
    return oThis.ic().configStrategy;
  }

  _sanitizeSpecificParams() {
    throw 'sub-class to implement';
  }

  async _performSpecificPreChecks() {
    throw 'sub-class to implement';
  }

  async _performOperation() {
    throw 'sub-class to implement';
  }
}

module.exports = MultisigOpertationBaseKlass;
