/**
 * This service gets the gateway composer contract address, origin chain gas price,
 * gateway contract address, staker nonce from gateway, precise amount of bt and stake currency.
 *
 * @module app/services/token/PreMint
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  MosaicJs = require('@openst/mosaic.js');

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  StakerWhitelistedAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/StakerWhitelistedAddress'),
  TokenCompanyUserCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenCompanyUserDetail'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

class PreMint extends ServiceBase {
  /**
   * Constructor for pre mint.
   *
   * @param {Object} params
   * @param {Number} params.client_id: client id
   * @param {Number} params.token_id: token id
   * @param {String} params.bt_to_mint: in wei bt amount
   * @param {Boolean} params.fetch_request_stake_tx_params: boolean which would determine fetching params needed
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;
    oThis.btAmountInWei = params.bt_to_mint;

    // optional
    oThis.fetchRequestStakeTxParams = params.fetch_request_stake_tx_params;

    oThis.preciseAmounts = {};
    oThis.requestStakeTxParams = {};
  }

  /**
   * AsyncPerform
   *
   * @return {Promise<any>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchTokenDetails();

    await oThis._getPreciseAmount();

    if (CommonValidators.isVarTrue(oThis.fetchRequestStakeTxParams)) {
      oThis._getContractGasPriceAndGasLimit();

      await oThis.getGatewayComposerContractAddress();

      await oThis.getGatewayContractAddress();

      await oThis.getBeneficiaryAddress();

      await oThis.getOriginChainGasPrice();

      await oThis.getStakerNonceFromGateway();
    }

    return responseHelper.successWithData({
      precise_amounts: oThis.preciseAmounts,
      request_stake_tx_params: oThis.requestStakeTxParams
    });
  }

  /**
   * This function fetches simple token contract address and sets in response data hash.
   *
   * @returns {Promise<*>}
   */
  async getGatewayComposerContractAddress() {
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

    oThis.requestStakeTxParams.gateway_composer_contract_address = stakerWhitelistedAddrRsp.data.gatewayComposerAddress;
  }

  /**
   * This function fetches gateway contract address from cache and sets in response data hash.
   *
   * @returns {Promise<>}
   */
  async getGatewayContractAddress() {
    const oThis = this;

    const tokenAddressesCacheObj = new TokenAddressCache({
        tokenId: oThis.tokenId
      }),
      tokenAddressesRsp = await tokenAddressesCacheObj.fetch();

    if (tokenAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_c_gc_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.requestStakeTxParams.gateway_contract_address =
      tokenAddressesRsp.data[tokenAddressConstants.tokenGatewayContract];
  }

  /**
   * This function fetches gateway contract address from cache and sets in response data hash.
   *
   * @returns {Promise<>}
   */
  async getBeneficiaryAddress() {
    const oThis = this;

    const tokenCompanyUserCacheRsp = await new TokenCompanyUserCache({ tokenId: oThis.tokenId }).fetch();

    if (
      tokenCompanyUserCacheRsp.isFailure() ||
      !tokenCompanyUserCacheRsp.data ||
      !tokenCompanyUserCacheRsp.data.userUuids ||
      tokenCompanyUserCacheRsp.data.userUuids.length === 0
    ) {
      return Promise.reject(tokenCompanyUserCacheRsp);
    }

    const tokenHolderUuid = tokenCompanyUserCacheRsp.data.userUuids[0],
      TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({
        tokenId: oThis.tokenId,
        userIds: [tokenHolderUuid]
      }),
      tokenUserDetailsCacheRsp = await tokenUserDetailsCacheObj.fetch();

    if (
      tokenUserDetailsCacheRsp.isFailure() ||
      !tokenUserDetailsCacheRsp.data ||
      !tokenUserDetailsCacheRsp.data[tokenHolderUuid]
    ) {
      return Promise.reject(tokenUserDetailsCacheRsp);
    }

    oThis.requestStakeTxParams.stake_and_mint_beneficiary =
      tokenUserDetailsCacheRsp.data[tokenHolderUuid].tokenHolderAddress;
  }

  /**
   * This function fetches origin chain gas price and sets in response data hash.
   *
   * @returns {Promise<*>}
   */
  async getOriginChainGasPrice() {
    const oThis = this;

    const gasPriceCacheObj = new gasPriceCacheKlass(),
      gasPriceRsp = await gasPriceCacheObj.fetch();

    oThis.requestStakeTxParams.origin_chain_gas_price = gasPriceRsp.data;
  }

  /**
   * This function gets staker nonce from gateway.
   *
   * @return {Promise<>}
   */
  async getStakerNonceFromGateway() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();

    oThis.stakerNonce = await oThis._stakeHelperObject.getNonce(
      oThis.requestStakeTxParams.gateway_composer_contract_address,
      oThis.originReadOnlyWeb3,
      oThis.requestStakeTxParams.gateway_contract_address
    );

    oThis.requestStakeTxParams.staker_gateway_nonce = oThis.stakerNonce;
  }

  /**
   * Get gateway composer contracts gas price and gas limit
   *
   * @private
   */
  _getContractGasPriceAndGasLimit() {
    const oThis = this;

    oThis.requestStakeTxParams.gas_price = contractConstants.gatewayComposerGasPrice;
    oThis.requestStakeTxParams.gas_limit = contractConstants.gatewayComposerGasLimit;
  }

  /**
   * This function sets web3 instance, which is used to get staker nonce from gateway
   *
   * @return {Promise<void>}
   * @private
   */
  async _setOriginWeb3Instance() {
    const oThis = this;

    const configStrategy = oThis.ic().configStrategy,
      originChainId = configStrategy.constants.originChainId,
      response = await chainConfigProvider.getFor([originChainId]),
      originChainConfig = response[originChainId],
      originWsProviders = originChainConfig.originGeth.readOnly.wsProviders;

    const shuffledProviders = basicHelper.shuffleArray(originWsProviders);

    oThis.originReadOnlyWeb3 = web3Provider.getInstance(shuffledProviders[0]).web3WsProvider;
  }

  /**
   * Calculates precise amount
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getPreciseAmount() {
    const oThis = this;

    let conversionFactor = oThis.token.conversionFactor,
      conversionFactorBN = basicHelper.convertToBigNumber(conversionFactor),
      btAmountBN = basicHelper.convertToBigNumber(oThis.btAmountInWei);

    let computedStakeAmountBN = btAmountBN.div(conversionFactorBN),
      computedStakeAmountStr = basicHelper.formatWeiToString(computedStakeAmountBN),
      // as contract always floor's the number. applying a custom logic
      truncatedComputedStakeAmountStr = computedStakeAmountStr.split('.')[0];

    oThis.preciseAmounts = {
      stake_currency: basicHelper.formatWeiToString(truncatedComputedStakeAmountStr),
      bt: oThis.btAmountInWei
    };

    //Todo: Add logic to handle the precision.
  }

  /**
   * Get staker helper object
   *
   */
  get _stakeHelperObject() {
    const oThis = this;

    if (!oThis.mosaicStakeHelper) {
      oThis.mosaicStakeHelper = new MosaicJs.Helpers.StakeHelper();
    }

    return oThis.mosaicStakeHelper;
  }
}

InstanceComposer.registerAsShadowableClass(PreMint, coreConstants.icNameSpace, 'PreMint');

module.exports = {};
