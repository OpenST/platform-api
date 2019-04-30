'use strict';

/*
 * This file helps in handling transaction provided by FE or submitting Stake Tx
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  BrandedToken = require('@openst/brandedtoken.js');

const rootPrefix = '../../../..',
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  StakerWhitelistedAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/StakerWhitelistedAddress'),
  RecordOrSubmitBase = require(rootPrefix + '/lib/stakeAndMint/brandedToken/recordOrSubmit/Base');

require(rootPrefix + '/app/services/token/PreMint');

class RecordOrSubmitStakeTx extends RecordOrSubmitBase {
  /**
   *
   * @param params
   * @param params.clientId {Number} - client id
   * @param params.tokenId {Number} - token id
   * @param params.originChainId (Number) - origin chain id
   * @param params.stakerAddress {String} - staker address
   * @param params.stakeCurrencyToStakeInWei {String} - stable currency to be stake amount
   * @param params.btToMintInWei {String} - stable currency to be stake amount
   * @param [params.requestStakeTransactionHash] {String} - optional txHash, if not present we submit a fresh tx
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
   *
   * Set to address
   *
   * @private
   */
  async _setToAddress() {
    const oThis = this;
    oThis.toAddress = await oThis._fetchGatewayComposerAddresses();
  }

  /**
   * Fetch gateway composer addresses
   *
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
   *
   * fetch all data points needed to submit tx
   *
   * @private
   */
  async _fetchDataRequiredToSubmitTransaction() {
    const oThis = this;
    console.log('stake 1');
    await oThis._setToAddress();
    console.log('stake 2');
    await oThis._setOriginChainGasPrice();
    console.log('stake 3');
    let PreMint = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'PreMint');

    let preMintObj = new PreMint({
      client_id: oThis.clientId,
      token_id: oThis.tokenId,
      stake_currency_to_stake: oThis.stakeCurrencyToStakeInWei,
      bt_to_mint: oThis.btToMintInWei,
      fetch_request_stake_tx_params: true
    });
    console.log('stake 4');
    let preMintResponse = await preMintObj.perform();

    if (preMintResponse.isFailure()) {
      return Promise.reject(preMintResponse);
    }
    console.log('stake 5');
    oThis.requestStakeTxParams = preMintResponse.data.request_stake_tx_params;
    console.log(' oThis.requestStakeTxParams', oThis.requestStakeTxParams);
  }

  /**
   *
   * submit tx to geth
   *
   * @private
   */
  async _submitTransaction() {
    const oThis = this,
      contractInteract = new BrandedToken.ContractInteract.GatewayComposer(
        oThis.originWeb3,
        oThis.requestStakeTxParams.gateway_composer_contract_address
      );
    console.log('oThis.stakeCurrencyToStakeInWei', oThis.stakeCurrencyToStakeInWei);
    console.log('oThis.btToMintInWei', oThis.btToMintInWei);
    console.log(
      'oThis.requestStakeTxParams.gateway_contract_address,',
      oThis.requestStakeTxParams.gateway_contract_address
    );
    console.log(
      'oThis.requestStakeTxParams.stake_and_mint_beneficiary,',
      oThis.requestStakeTxParams.stake_and_mint_beneficiary
    );
    console.log('oThis.requestStakeTxParams.staker_gateway_nonce,', oThis.requestStakeTxParams.staker_gateway_nonce);

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

    console.log('oThis.oThis.txOptions', txOptions);
    console.log('oThis.originChainId', oThis.originChainId);
    console.log('oThis.oThis.originShuffledProviders[0]', oThis.originShuffledProviders[0]);
    console.log('oThis.stakerAddress', oThis.stakerAddress);
    console.log('oThis.toAddress', oThis.toAddress);

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
