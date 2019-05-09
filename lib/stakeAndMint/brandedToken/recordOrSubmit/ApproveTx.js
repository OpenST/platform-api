/**
 * Module to help in handling transaction provided by FE or submitting Approve Tx.
 *
 * @module lib/stakeAndMint/brandedToken/recordOrSubmit/ApproveTx
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  MosaicJs = require('@openst/mosaic.js');

const rootPrefix = '../../../..',
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  RecordOrSubmitBase = require(rootPrefix + '/lib/stakeAndMint/brandedToken/recordOrSubmit/Base'),
  StakeCurrencyByIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyById'),
  StakerWhitelistedAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/StakerWhitelistedAddress'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to help in handling transaction provided by FE or submitting Approve Tx.
 *
 * @class RecordOrSubmitApproveTx
 */
class RecordOrSubmitApproveTx extends RecordOrSubmitBase {
  /**
   * Constructor to help in handling transaction provided by FE or submitting Approve Tx.
   *
   * @param {object} params
   * @param {number} params.clientId: client id
   * @param {number} params.tokenId: token id
   * @param {number} params.originChainId: origin chain id
   * @param {string} params.stakerAddress: staker address
   * @param {string} params.stakeCurrencyToStakeInWei: stable currency to be stake amount in wei
   * @param {string} [params.approveTransactionHash]: optional txHash, if not present we submit a fresh tx
   *
   * @augments RecordOrSubmitBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.stakeCurrencyToStakeInWei = params.stakeCurrencyToStakeInWei;

    // Optional.
    oThis.transactionHash = params.approveTransactionHash;
    oThis.pendingTransactionKind = pendingTransactionConstants.approveGatewayComposerKind;

    oThis.gatewayComposerContractAddress = null;
  }

  /**
   * Set to address.
   *
   * @sets oThis.toAddress
   *
   * @return {Promise<void>}
   * @private
   */
  async _setToAddress() {
    const oThis = this;

    oThis.toAddress = await oThis._fetchStakeCurrencyContractAddress();
  }

  /**
   * Fetch stake currency contract address.
   *
   * @return {Promise<*>}
   * @private
   */
  async _fetchStakeCurrencyContractAddress() {
    const oThis = this;

    const tokenCache = new TokenCache({
      clientId: oThis.clientId
    });

    const response = await tokenCache.fetch();
    if (response.isFailure()) {
      return Promise.reject(response);
    }

    const stakeCurrencyId = response.data.stakeCurrencyId;

    const stakeCurrencyCacheResponse = await new StakeCurrencyByIdCache({
      stakeCurrencyIds: [stakeCurrencyId]
    }).fetch();

    if (stakeCurrencyCacheResponse.isFailure()) {
      return Promise.reject(stakeCurrencyCacheResponse);
    }

    return stakeCurrencyCacheResponse.data[stakeCurrencyId].contractAddress;
  }

  /**
   * Fetch all data points needed to submit tx.
   *
   * @sets oThis.gatewayComposerContractAddress
   *
   * @return {Promise<never>}
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
   * Submit transaction on geth.
   *
   * @return {Promise<void>}
   * @private
   */
  async _submitTransaction() {
    const oThis = this,
      contractInteract = new MosaicJs.ContractInteract.EIP20Token(oThis.originWeb3, oThis.toAddress);

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
