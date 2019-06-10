/**
 * Module for base class for device related multi sig operations.
 *
 * @module app/services/device/multisigOperation/Base
 */

const OpenSTJs = require('@openst/openst.js'),
  GnosisSafeHelper = OpenSTJs.Helpers.GnosisSafe;

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  signatureVerification = require(rootPrefix + '/lib/validators/Sign'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  publishToPreProcessor = require(rootPrefix + '/lib/webhooks/publishToPreProcessor'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/device/UpdateStatus');
require(rootPrefix + '/app/models/ddb/sharded/Device');

/**
 * Class for device related multi sig operations.
 *
 * @class MultisigOpertationBaseKlass
 */
class MultisigOpertationBaseKlass extends ServiceBase {
  /**
   * Constructor for device related multi sig operations.
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {number} params.token_id
   * @param {object} params.user_data
   *
   * @param {string} params.to: Destination address of Safe transaction, multisig proxy address
   * @param {string/number} params.value: Ether value of Safe transaction, eth value in wei
   * @param {string} params.calldata: Data payload of Safe transaction
   * @param {number} params.operation: Operation type of Safe transaction
   * @param {string/number} params.safe_tx_gas: Gas that should be used for the Safe transaction
   * @param {string/number} params.data_gas: Gas costs for data used to trigger the safe transaction and to pay the payment transfer
   * @param {string/number} params.gas_price: Gas price that should be used for the payment calculation
   * @param {string} params.gas_token: Token address (or 0 if ETH) that is used for the payment
   * @param {string} params.refund_receiver: Address of receiver of gas payment (or 0 if tx.origin)
   * @param {string} params.signatures: Packed signature data ({bytes32 r}{bytes32 s}{uint8 v})
   * @param {array} params.signers: array of authorized device addresses who signed this transaction
   * @param {string/number} params.nonce: multisig contract nonce
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
   * Async perform.
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
   * Sanitize parameters.
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
          params_error_identifiers: ['invalid_signer'],
          debug_options: {}
        })
      );
    }

    oThis.signer = basicHelper.sanitizeAddress(oThis.signers[0]);

    // Sanitize action specific params.
    await oThis._sanitizeSpecificParams();
  }

  /**
   * Perform common pre checks.
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

    const tokenUserDetails = oThis.userData;

    // Check if user is activated.
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

    // Check multisig address.
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
    // Validates if the signatures provided is valid.
    await oThis._validateSignature();

    // Perform action specific pre checks.
    await oThis._performSpecificPreChecks();

    return responseHelper.successWithData({});
  }

  /**
   * Validate signature.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateSignature() {
    const oThis = this;

    const gnosisSafeProxyInstance = new GnosisSafeHelper(oThis.multisigAddress, oThis._web3Instance),
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

    const verifySignRsp = await signatureVerification.validateSignature(
      safeTxData.getEIP712SignHash(),
      oThis.signatures,
      oThis.signer
    );

    if (!verifySignRsp.isValid) {
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
   * Return specific device details.
   *
   * @param {string} deviceAddresses
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchDeviceDetails(deviceAddresses) {
    const oThis = this;

    const paramsForDeviceDetailsCache = {
      userId: oThis.userId,
      walletAddresses: deviceAddresses,
      tokenId: oThis.tokenId,
      shardNumber: oThis.deviceShardNumber
    };

    const DeviceDetailsKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache'),
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
   * @param {string} deviceAddress
   * @param {string} initialDeviceStatus
   * @param {string} finalDeviceStatus
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _updateDeviceStatus(deviceAddress, initialDeviceStatus, finalDeviceStatus) {
    const oThis = this;

    logger.debug('**** Updating device status');
    const paramsToUpdateDeviceStatus = {
      chainId: oThis._configStrategyObject.auxChainId,
      shardNumber: oThis.deviceShardNumber,
      userId: oThis.userId,
      walletAddress: deviceAddress,
      initialStatus: initialDeviceStatus,
      finalStatus: finalDeviceStatus
    };
    const UpdateDeviceStatusKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UpdateDeviceStatus'),
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
   * Object of config strategy class.
   *
   * @sets oThis.configStrategyObj
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
   * Config strategy
   *
   * @return {object}
   */
  get _configStrategy() {
    const oThis = this;

    return oThis.ic().configStrategy;
  }

  /**
   * Send webhook message to Preprocessor.
   *
   * @param {string} webhookKind
   * @param {string} deviceAddress
   *
   * @returns {Promise<*>}
   * @private
   */
  async _sendPreprocessorWebhook(webhookKind, deviceAddress) {
    const oThis = this;

    const payload = {
      userId: oThis.userId,
      webhookKind: webhookKind,
      clientId: oThis.clientId,
      tokenId: oThis.tokenId,
      deviceAddress: deviceAddress
    };

    await publishToPreProcessor.perform(oThis._configStrategyObject.auxChainId, payload);
  }

  _sanitizeSpecificParams() {
    throw new Error('Sub-class to implement.');
  }

  async _performSpecificPreChecks() {
    throw new Error('Sub-class to implement.');
  }

  async _performOperation() {
    throw new Error('Sub-class to implement.');
  }
}

module.exports = MultisigOpertationBaseKlass;
