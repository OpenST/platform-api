/**
 * Module to help in handling transaction provided by FE or submitting Stake Tx.
 *
 * @module lib/stakeAndMint/brandedToken/recordOrSubmit/StakeTx
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  BrandedToken = require('@openst/brandedtoken.js');

const rootPrefix = '../../../..',
  RecordOrSubmitBase = require(rootPrefix + '/lib/stakeAndMint/brandedToken/recordOrSubmit/Base'),
  StakerWhitelistedAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/StakerWhitelistedAddress'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/services/token/PreMint');

/**
 * Class to help in handling transaction provided by FE or submitting Stake Tx.
 *
 * @class RecordOrSubmitStakeTx
 */
class RecordOrSubmitStakeTx extends RecordOrSubmitBase {
  /**
   * Constructor to help in handling transaction provided by FE or submitting Stake Tx.
   *
   * @param {object} params
   * @param {number} params.clientId: client id
   * @param {number} params.tokenId: token id
   * @param {number} params.originChainId: origin chain id
   * @param {string} params.stakerAddress: staker address
   * @param {string} params.stakeCurrencyToStakeInWei: stable currency to be stake amount
   * @param {string} params.btToMintInWei: stable currency to be stake amount
   * @param {string} [params.requestStakeTransactionHash]: optional txHash, if not present we submit a fresh tx.
   *
   * @augments RecordOrSubmitBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;

    oThis.transactionHash = params.requestStakeTransactionHash;

    oThis.pendingTransactionKind = pendingTransactionConstants.requestStakeKind;

    oThis.stakeCurrencyToStakeInWei = params.stakeCurrencyToStakeInWei;
    oThis.btToMintInWei = params.btToMintInWei;

    oThis.requestStakeTxParams = null;
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

    oThis.toAddress = await oThis._fetchGatewayComposerAddresses();
  }

  /**
   * Fetch gateway composer addresses.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayComposerAddresses() {
    const oThis = this;

    const stakerWhitelistedCacheObj = new StakerWhitelistedAddressCache({
        tokenId: oThis.tokenId
      }),
      stakerWhitelistedAddrRsp = await stakerWhitelistedCacheObj.fetch();

    if (stakerWhitelistedAddrRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_c_gc_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return stakerWhitelistedAddrRsp.data.gatewayComposerAddress;
  }

  /**
   * Fetch all data points needed to submit tx.
   *
   * @sets oThis.requestStakeTxParams
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchDataRequiredToSubmitTransaction() {
    const oThis = this;

    await oThis._setToAddress();

    await oThis._setOriginChainGasPrice();

    const PreMint = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'PreMint');

    const preMintObj = new PreMint({
      client_id: oThis.clientId,
      token_id: oThis.tokenId,
      stake_currency_to_stake: oThis.stakeCurrencyToStakeInWei,
      bt_to_mint: oThis.btToMintInWei,
      fetch_request_stake_tx_params: true
    });

    const preMintResponse = await preMintObj.perform();

    if (preMintResponse.isFailure()) {
      return Promise.reject(preMintResponse);
    }

    oThis.requestStakeTxParams = preMintResponse.data.request_stake_tx_params;
  }

  /**
   * Submit tx on geth.
   *
   * @return {Promise<*>}
   * @private
   */
  async _submitTransaction() {
    const oThis = this,
      contractInteract = new BrandedToken.ContractInteract.GatewayComposer(
        oThis.originWeb3,
        oThis.requestStakeTxParams.gateway_composer_contract_address
      );

    const txObject = await contractInteract.requestStakeRawTx(
        oThis.stakeCurrencyToStakeInWei,
        oThis.btToMintInWei,
        oThis.requestStakeTxParams.gateway_contract_address,
        oThis.requestStakeTxParams.stake_and_mint_beneficiary,
        '0',
        '0',
        oThis.requestStakeTxParams.staker_gateway_nonce
      ),
      data = txObject.encodeABI(),
      txOptions = {
        gasPrice: oThis.originChainGasPrice,
        gas: contractConstants.requestStakeGas
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

InstanceComposer.registerAsShadowableClass(RecordOrSubmitStakeTx, coreConstants.icNameSpace, 'RecordOrSubmitStakeTx');

module.exports = {};
