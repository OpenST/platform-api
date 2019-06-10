/**
 * Module for session related multi sig operations base.
 *
 * @module app/services/session/multisigOperation/Base
 */

const OpenSTJs = require('@openst/openst.js'),
  GnosisSafeHelper = OpenSTJs.Helpers.GnosisSafe;

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  signatureVerification = require(rootPrefix + '/lib/validators/Sign'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  publishToPreProcessor = require(rootPrefix + '/lib/webhooks/publishToPreProcessor');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/SessionsByAddress');

/**
 * Class for session related multi sig operations base.
 *
 * @class MultisigOpertationBaseKlass
 */
class MultisigSessionsOpertationBaseKlass extends ServiceBase {
  /**
   * Constructor for session related multi sig operations base.
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
   * @param {array} params.token_shard_details
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
    oThis.sessionShardNumber = params.user_data.sessionShardNumber;
    oThis.multisigProxyAddress = params.user_data.multisigAddress;
    oThis.tokenHolderProxyAddress = params.user_data.tokenHolderAddress;
    oThis.tokenShardDetails = params.token_shard_details;

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
   * Sanitize params.
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
          internal_error_identifier: 'a_s_s_mo_b_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_signer'],
          debug_options: {}
        })
      );
    }

    oThis.signer = basicHelper.sanitizeAddress(oThis.signers[0]);

    // Sanitize action specific params
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
          internal_error_identifier: 'a_s_s_mo_b_2',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['unauthorized_user_id'],
          debug_options: {}
        })
      );
    }

    if (tokenUserDetails.tokenHolderAddress !== oThis.to) {
      logger.error('Token holder address mismatch');

      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_s_mo_b_3',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_to'],
          debug_options: {}
        })
      );
    }

    const deviceDetailsRsp = await oThis._fetchDeviceDetails([oThis.signer]);

    const signerAddressDetails = deviceDetailsRsp.data[oThis.signer];

    if (
      basicHelper.isEmptyObject(signerAddressDetails) ||
      signerAddressDetails.status !== deviceConstants.authorizedStatus
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_s_mo_b_4',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['unauthorized_signer'],
          debug_options: {}
        })
      );
    }

    // Validates if the signatures provided is valid.
    await oThis._validateSignature();

    // Perform action specific pre checks.
    await oThis._performSpecificPreChecks();

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Return specific device details.
   *
   * @param {array<string>} deviceAddresses
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchDeviceDetails(deviceAddresses) {
    const oThis = this;

    const paramsForDeviceDetailsCache = {
      userId: oThis.userId,
      walletAddresses: deviceAddresses,
      tokenId: oThis.tokenId
    };

    const DeviceDetailsKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache'),
      deviceDetailsObj = new DeviceDetailsKlass(paramsForDeviceDetailsCache),
      deviceDetailsRsp = await deviceDetailsObj.fetch();

    if (deviceDetailsRsp.isFailure()) {
      logger.error('No data found for the provided wallet address');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_s_mo_b_5',
          api_error_identifier: 'cache_issue',
          debug_options: ''
        })
      );
    }

    return deviceDetailsRsp;
  }

  /**
   * Fetch specified session address details.
   *
   * @param {string} sessionAddress
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchSessionDetails(sessionAddress) {
    const oThis = this;

    const paramsForSessionsDetailsCache = {
      userId: oThis.userId,
      addresses: [sessionAddress],
      tokenId: oThis.tokenId,
      shardNumber: oThis.sessionShardNumber,
      consistentRead: 1 // NOTE: As this session was created just a while ago it is important for consistent read here.
    };

    const SessionDetailsKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionsByAddressCache'),
      sessionDetailsObj = new SessionDetailsKlass(paramsForSessionsDetailsCache),
      sessionDetailsRsp = await sessionDetailsObj.fetch();

    if (sessionDetailsRsp.isFailure()) {
      logger.error('No data found for the provided sessionAddress');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_s_mo_b_6',
          api_error_identifier: 'cache_issue',
          debug_options: ''
        })
      );
    }

    return sessionDetailsRsp;
  }

  /**
   * Validate signature.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateSignature() {
    const oThis = this;

    const gnosisSafeProxyInstance = new GnosisSafeHelper(oThis.multisigProxyAddress, oThis._web3Instance),
      safeTxData = gnosisSafeProxyInstance.getSafeTxData(
        oThis.tokenHolderProxyAddress,
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
   *
   * @returns {Promise<*>}
   * @private
   */
  async _sendPreprocessorWebhook(webhookKind) {
    const oThis = this;

    const payload = {
      userId: oThis.userId,
      webhookKind: webhookKind,
      clientId: oThis.clientId,
      tokenId: oThis.tokenId,
      sessionAddress: oThis.sessionKey
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

module.exports = MultisigSessionsOpertationBaseKlass;
