'use strict';

/*
 * This file helps in performing stake
 *
 * lib/stakeMintManagement/Stake.js
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractHelper = require(rootPrefix + '/helpers/contractHelper'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base'),
  Mosaic = require('@openstfoundation/mosaic-tbd');

class Stake extends Base {
  /**
   * @constructor
   *
   * @param params {Object}
   * @param params.originChainId   {Number}
   * @param params.amount          {Number}
   * @param params.beneficiary     {String}
   * @param params.stakerAddress   {String}
   *
   */
  constructor(params) {
    super(params);
  }

  /**
   * _asyncPerform
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setWeb3Instance();

    await oThis._fetchContractAddresses();

    await oThis._validateStakerAddress();

    await oThis._getStakerNonceFromGateway();

    await oThis._getHashLock();

    let response = await oThis._performStake();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskDone: 0,
          taskResponseData: { transactionHash: response.data.transactionHash }
        })
      );
    }
  }

  /**
   * _addressKindsToFetch
   *
   * @return {{origin: *[]}}
   * @private
   */
  _addressKindsToFetch() {
    const oThis = this;

    return {
      origin: [chainAddressConstants.originGatewayContractKind]
    };
  }

  /**
   * _validateStakerAddress - Validate staker address
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateStakerAddress() {
    const oThis = this;

    if (!oThis.stakerAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_smm_s_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: { stakerAddress: oThis.stakerAddress }
        })
      );
    }
  }

  /**
   * _getStakerNonceFromGateway
   *
   * @return {Promise<void>}
   * @private
   */
  async _getStakerNonceFromGateway() {
    const oThis = this;

    oThis.gatewayContractObject = await contractHelper.getMosaicTbdContractObj(
      oThis.originWeb3,
      'EIP20Gateway',
      oThis.gatewayContract
    );

    oThis.stakerNonce = await oThis.gatewayContractObject.methods.getNonce(oThis.stakerAddress).call({});
  }

  /**
   * _getHashLock
   *
   * @return {Promise<void>}
   * @private
   */
  async _getHashLock() {
    const oThis = this;

    let response = Mosaic.Helpers.StakeHelper.createSecretHashLock();

    oThis.hashLock = response.hashLock;
  }

  /**
   * _performStake - Invoke stake
   *
   * @return {Promise<void>}
   * @private
   */
  async _performStake() {
    const oThis = this;

    let gasPrice = '0';

    let data = await oThis.gatewayContractObject.methods
      .stake(
        oThis.amount,
        oThis.beneficiary,
        gasPrice,
        coreConstants.OST_ORIGIN_GAS_LIMIT,
        oThis.stakerNonce,
        oThis.hashLock
      )
      .encodeABI();

    return oThis.performTransaction(
      oThis.originChainId,
      oThis.originWsProviders[0],
      oThis.stakerAddress,
      oThis.gatewayContract,
      data
    );
  }
}

module.exports = Stake;
