'use strict';

/*
 * This file helps in handling transaction provided by FE or submitting Approve Tx
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  MosaicJs = require('@openst/mosaic.js');

const rootPrefix = '../../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  RecordOrSubmitBase = require(rootPrefix + '/lib/stakeAndMint/brandedToken/recordOrSubmit/Base'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  StakerWhitelistedAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/StakerWhitelistedAddress'),
  StakeCurrencyByIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyById');

class RecordOrSubmitApproveTx extends RecordOrSubmitBase {
  /**
   *
   * @param params
   * @param params.clientId {Number} - client id
   * @param params.tokenId {Number} - token id
   * @param params.originChainId (Number) - origin chain id
   * @param params.stakerAddress {String} - staker address
   * @param params.stakeCurrencyToStakeInWei {String} - stable currency to be stake amount in wei
   * @param [params.approveTransactionHash] {String} - optional txHash, if not present we submit a fresh tx
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.stakeCurrencyToStakeInWei = params.stakeCurrencyToStakeInWei;

    //optional
    oThis.transactionHash = params.approveTransactionHash;

    oThis.pendingTransactionKind = pendingTransactionConstants.approveGatewayComposerKind;

    oThis.gatewayComposerContractAddress = null;
  }

  /**
   *
   * Set to address
   *
   * @private
   */
  async _setToAddress() {
    const oThis = this;
    oThis.toAddress = await oThis._fetchStakeCurrencyContractAddress();
  }

  /**
   * Fetch stake currency contract address
   *
   * @private
   */
  async _fetchStakeCurrencyContractAddress() {
    const oThis = this;

    let tokenCache = new TokenCache({
      clientId: oThis.clientId
    });

    let response = await tokenCache.fetch();
    if (response.isFailure()) {
      return Promise.reject(response);
    }

    let stakeCurrencyId = response.data.stakeCurrencyId;

    let stakeCurrencyCacheResponse = await new StakeCurrencyByIdCache({ stakeCurrencyIds: [stakeCurrencyId] }).fetch();

    if (stakeCurrencyCacheResponse.isFailure()) {
      return Promise.reject(stakeCurrencyCacheResponse);
    }

    return stakeCurrencyCacheResponse.data[stakeCurrencyId]['contractAddress'];
  }

  /**
   *
   * fetch all data points needed to submit tx
   *
   * @private
   */
  async _fetchDataRequiredToSubmitTransaction() {
    const oThis = this;

    await oThis._setToAddress();

    await oThis._setOriginChainGasPrice();

    const stakerWhitelistedCacheObj = new StakerWhitelistedAddressCache({
        tokenId: oThis.tokenId
      }),
      stakerWhitelistedAddrRsp = await stakerWhitelistedCacheObj.fetch();

    if (stakerWhitelistedAddrRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_sam_bt_ros_a_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.gatewayComposerContractAddress = stakerWhitelistedAddrRsp.data.gatewayComposerAddress;
  }

  /**
   *
   * submit tx to geth
   *
   * @private
   */
  async _submitTransaction() {
    const oThis = this,
      contractInteract = new MosaicJs.ContractInteract.EIP20Token(oThis.originWeb3, oThis.toAddress);

    console.log('oThis.gatewayComposerContractAddress', oThis.gatewayComposerContractAddress);
    console.log('oThis.stakeCurrencyToStakeInWei', oThis.stakeCurrencyToStakeInWei);
    console.log('oThis.originChainGasPrice', oThis.originChainGasPrice);
    console.log('contractConstants.approveErc20TokenGas', contractConstants.approveErc20TokenGas);
    console.log('oThis.originChainId', oThis.originChainId);
    console.log('oThis.originShuffledProviders[0]', oThis.originShuffledProviders[0]);
    console.log('oThis.stakerAddress', oThis.stakerAddress);
    console.log('oThis.toAddress', oThis.toAddress);

    const txObject = await contractInteract.approveRawTx(
        oThis.gatewayComposerContractAddress,
        oThis.stakeCurrencyToStakeInWei
      ),
      data = txObject.encodeABI(),
      txOptions = {
        gasPrice: oThis.originChainGasPrice,
        gas: contractConstants.approveErc20TokenGas
      };

    return oThis.performTransaction(
      oThis.originChainId,
      oThis.originShuffledProviders[0],
      oThis.stakerAddress,
      oThis.toAddress,
      txOptions,
      data
    );
  }

  /**
   * Get submit transaction parameters.
   *
   * @return {object}
   */
  get _customSubmitTxParams() {
    const oThis = this;
    return {
      pendingTransactionKind: oThis.pendingTransactionKind
    };
  }
}

InstanceComposer.registerAsShadowableClass(
  RecordOrSubmitApproveTx,
  coreConstants.icNameSpace,
  'RecordOrSubmitApproveTx'
);

module.exports = {};
