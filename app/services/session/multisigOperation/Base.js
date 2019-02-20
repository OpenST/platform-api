'use strict';

/**
 *  Base for session related multi sig operations
 *
 * @module app/services/session/multisigOperation/Base
 */

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/SessionsByAddress');

/**
 * Class for session related multi sig operations
 *
 * @class MultisigOpertationBaseKlass
 */
class MultisigSessionsOpertationBaseKlass extends ServiceBase {
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
   * @param {String} params.signer - authorized device address who signed this transaction
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

    oThis.to = params.to;
    oThis.value = params.value;
    oThis.calldata = params.calldata;
    oThis.operation = params.operation;
    oThis.safeTxGas = params.safe_tx_gas;
    oThis.dataGas = params.data_gas;
    oThis.gasPrice = params.gas_price;
    oThis.gasToken = params.gas_token;
    oThis.refundReceiver = params.refund_receiver;
    oThis.signature = params.signatures;
    oThis.signer = params.signer;

    oThis.configStrategyObj = null;
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
    oThis.signer = basicHelper.sanitizeAddress(oThis.signer);

    // Sanitize action specific params
    oThis._sanitizeSpecificParams();
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
          internal_error_identifier: 'a_s_s_mo_b_1',
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
          internal_error_identifier: 'a_s_s_mo_b_2',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_to'],
          debug_options: {}
        })
      );
    }

    let deviceDetailsRsp = await oThis._fetchDeviceDetails([oThis.signer]);

    let signerAddressDetails = deviceDetailsRsp.data[oThis.signer];

    if (
      basicHelper.isEmptyObject(signerAddressDetails) ||
      signerAddressDetails.status !== deviceConstants.authorisedStatus
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_s_mo_b_3',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['unauthorized_signer'],
          debug_options: {}
        })
      );
    }

    // Perform action specific pre checks
    await oThis._performSpecificPreChecks();

    return Promise.resolve(responseHelper.successWithData({}));
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
      tokenId: oThis.tokenId
    };

    let DeviceDetailsKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache'),
      deviceDetailsObj = new DeviceDetailsKlass(paramsForDeviceDetailsCache),
      deviceDetailsRsp = await deviceDetailsObj.fetch();

    if (deviceDetailsRsp.isFailure()) {
      logger.error('No data found for the provided wallet address');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_s_mo_b_4',
          api_error_identifier: 'cache_issue',
          debug_options: ''
        })
      );
    }

    return deviceDetailsRsp;
  }

  /**
   * Fetch specified session address details
   *
   * @param sessionAddress
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _fetchSessionDetails(sessionAddress) {
    const oThis = this;

    let paramsForSessionsDetailsCache = {
      userId: oThis.userId,
      addresses: [sessionAddress],
      tokenId: oThis.tokenId,
      shardNumber: oThis.sessionShardNumber,
      consistentRead: 1 //NOTE: As this session was created just a while ago it is important for consistent read here.
    };

    let SessionDetailsKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionsByAddressCache'),
      sessionDetailsObj = new SessionDetailsKlass(paramsForSessionsDetailsCache),
      sessionDetailsRsp = await sessionDetailsObj.fetch();

    if (sessionDetailsRsp.isFailure()) {
      logger.error('No data found for the provided sessionAddress');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_s_mo_b_5',
          api_error_identifier: 'cache_issue',
          debug_options: ''
        })
      );
    }

    return sessionDetailsRsp;
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

module.exports = MultisigSessionsOpertationBaseKlass;
