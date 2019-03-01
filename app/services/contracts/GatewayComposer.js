'use strict';

/**
 * This service gets the
 * gateway composer contract address,
 * origin chain gas price,
 * gateway contract address,
 * staker nonce from gateway
 *
 * @module app/services/contracts/GatewayComposer
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  MosaicJs = require('@openstfoundation/mosaic.js');

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  StakerWhitelistedAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/StakerWhitelistedAddress'),
  TokenCompanyUserCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenCompanyUserDetail'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

class GatewayComposer {
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.token_id;
    oThis.stakerAddress = params.staker_address;

    oThis.responseData = {};
  }

  /**
   * perform
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('app/services/contracts/GatewayComposer::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'a_s_c_gc_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * asyncPerform
   *
   * @return {Promise<any>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._validateAndSanitize();

    await oThis.getGatewayComposerContractAddress();

    await oThis.getGatewayContractAddress();

    await oThis.getBeneficiaryAddress();

    await oThis.getOriginChainGasPrice();

    await oThis.getStakerNonceFromGateway();

    return responseHelper.successWithData(oThis.responseData);
  }

  /**
   *
   * @returns {Promise<*>}
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    if (!basicHelper.isEthAddressValid(oThis.stakerAddress)) {
      logger.error('Staker address is not passed or wrong in input parameters.');
      return responseHelper.error({
        internal_error_identifier: 'a_s_c_gc_3',
        api_error_identifier: 'invalid_params',
        debug_options: {}
      });
    }
  }

  /**
   * This function fetches simple token contract address and sets in response data hash.
   *
   * @returns {Promise<*>}
   */
  async getGatewayComposerContractAddress() {
    const oThis = this;
    let stakerWhitelistedCacheObj = new StakerWhitelistedAddressCache({
        tokenId: oThis.tokenId,
        address: oThis.stakerAddress
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

    oThis.responseData['gateway_composer_contract_address'] = stakerWhitelistedAddrRsp.data.gatewayComposerAddress;
  }

  /**
   * This function fetches gateway contract address from cache and sets in response data hash.
   *
   * @returns {Promise<>}
   */
  async getGatewayContractAddress() {
    const oThis = this;

    let tokenAddressesCacheObj = new TokenAddressCache({
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

    oThis.responseData['gateway_contract_address'] = tokenAddressesRsp.data[tokenAddressConstants.tokenGatewayContract];
  }

  /**
   * This function fetches gateway contract address from cache and sets in response data hash.
   *
   * @returns {Promise<>}
   */
  async getBeneficiaryAddress() {
    const oThis = this;

    let tokenCompanyUserCacheRsp = await new TokenCompanyUserCache({ tokenId: oThis.tokenId }).fetch();

    if (
      tokenCompanyUserCacheRsp.isFailure() ||
      !tokenCompanyUserCacheRsp.data ||
      !tokenCompanyUserCacheRsp.data['userUuids'] ||
      tokenCompanyUserCacheRsp.data['userUuids'].length === 0
    ) {
      return Promise.reject(tokenCompanyUserCacheRsp);
    }

    let tokenHolderUuid = tokenCompanyUserCacheRsp.data['userUuids'][0],
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

    oThis.responseData['stake_and_mint_beneficiary'] =
      tokenUserDetailsCacheRsp.data[tokenHolderUuid]['tokenHolderAddress'];
  }

  /**
   * This function fetches origin chain gas price and sets in response data hash.
   *
   * @returns {Promise<*>}
   */
  async getOriginChainGasPrice() {
    const oThis = this;

    let gasPriceCacheObj = new gasPriceCacheKlass(),
      gasPriceRsp = await gasPriceCacheObj.fetch();

    oThis.responseData['origin_chain_gas_price'] = gasPriceRsp.data;
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
      oThis.responseData['gateway_composer_contract_address'],
      oThis.originReadOnlyWeb3,
      oThis.responseData['gateway_contract_address']
    );

    oThis.responseData['staker_gateway_nonce'] = oThis.stakerNonce;
  }

  /**
   * This function sets web3 instance, which is used to get staker nonce from gateway
   *
   * @return {Promise<void>}
   * @private
   */
  async _setOriginWeb3Instance() {
    const oThis = this;

    let configStrategy = oThis.ic().configStrategy,
      originChainId = configStrategy.constants.originChainId,
      response = await chainConfigProvider.getFor([originChainId]),
      originChainConfig = response[originChainId],
      originWsProviders = originChainConfig.originGeth.readOnly.wsProviders;

    let shuffledProviders = basicHelper.shuffleArray(originWsProviders);

    oThis.originReadOnlyWeb3 = web3Provider.getInstance(shuffledProviders[0]).web3WsProvider;
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

module.exports = GatewayComposer;

InstanceComposer.registerAsShadowableClass(GatewayComposer, coreConstants.icNameSpace, 'GatewayComposer');
