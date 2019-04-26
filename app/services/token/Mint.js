/**
 * Module to get the base currency contract address and origin chain gas price.
 *
 * @module app/services/token/Mint
 */

const BigNumber = require('bignumber.js');

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  GasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice'),
  StakeCurrencyByIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyById'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

/**
 * Class to get the base currency contract address and origin chain gas price.
 *
 * @class TokenMintDetails
 */
class TokenMintDetails extends ServiceBase {
  /**
   * Constructor to get the base currency contract address and origin chain gas price.
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {string} params.total_gas_for_mint
   *
   * @augments ServiceBase
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.totalGasForMint = params.total_gas_for_mint;

    oThis.responseData = {};
    oThis.stakeCurrencyContractAddress = '';
    oThis.brandedTokenAddress = '';
  }

  /**
   * Async perform.
   *
   * @return {Promise<any>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchTokenDetails();

    await oThis.fetchStakeCurrencyContractAddress();

    await oThis.getBrandedTokenContractAddress();

    await oThis.getOriginChainGasPrice();

    await oThis.calculateMinimumEthRequired();

    await oThis.calculateMinimumStakeCurrencyRequired();

    oThis.responseData.contract_address = {
      stake_currency: oThis.stakeCurrencyContractAddress,
      branded_token: oThis.brandedTokenAddress
    };

    return responseHelper.successWithData(oThis.responseData);
  }

  /**
   * This function fetches stake currency details.
   *
   * @param {number} stakeCurrencyId
   *
   * @returns {Promise<*>}
   */
  async fetchStakeCurrencyDetails(stakeCurrencyId) {
    const oThis = this;

    const stakeCurrencyCacheResponse = await new StakeCurrencyByIdCache({
      stakeCurrencyIds: [stakeCurrencyId]
    }).fetch();

    if (stakeCurrencyCacheResponse.isFailure()) {
      logger.error('Could not fetch stake currency details.');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_m_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            stakeCurrencyIds: [oThis.stakeCurrencyId]
          }
        })
      );
    }

    return stakeCurrencyCacheResponse.data[stakeCurrencyId];
  }

  /**
   * This function fetches and sets stake currency contract address.
   *
   * @sets oThis.stakeCurrencyContractAddress
   *
   * @returns {Promise<void>}
   */
  async fetchStakeCurrencyContractAddress() {
    const oThis = this;

    const stakeCurrencyDetails = await oThis.fetchStakeCurrencyDetails(oThis.token.stakeCurrencyId);

    if (stakeCurrencyDetails.isFailure()) {
      return Promise.reject(stakeCurrencyDetails);
    }

    oThis.stakeCurrencyContractAddress = stakeCurrencyDetails.contractAddress;
  }

  /**
   * This function fetches branded token contract address.
   *
   * @sets oThis.brandedTokenAddress
   *
   * @returns {Promise<*>}
   */
  async getBrandedTokenContractAddress() {
    const oThis = this;

    const getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    if (getAddrRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_m_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.brandedTokenAddress = getAddrRsp.data[tokenAddressConstants.brandedTokenContract];
  }

  /**
   * This function fetches origin chain gas price and sets in response data hash.
   *
   * @sets oThis.responseData.gas_price
   *
   * @returns {Promise<*>}
   */
  async getOriginChainGasPrice() {
    const oThis = this;

    const gasPriceCacheObj = new GasPriceCache(),
      gasPriceRsp = await gasPriceCacheObj.fetch();

    oThis.responseData.gas_price = { origin: gasPriceRsp.data };
  }

  /**
   * Calculate minimum ETH required.
   *
   * @sets oThis.responseData.minimum_eth_required
   *
   * @return {Promise<void>}
   */
  async calculateMinimumEthRequired() {
    const oThis = this;

    const averageGasUsedForMintBN = new BigNumber(oThis.totalGasForMint),
      gasPriceBN = new BigNumber(coreConstants.MAX_ORIGIN_GAS_PRICE);

    let minimumEthRequired = averageGasUsedForMintBN.mul(gasPriceBN);

    const bufferAmount = minimumEthRequired.div(2);

    minimumEthRequired = minimumEthRequired.add(bufferAmount);

    oThis.responseData.minimum_eth_required = minimumEthRequired.toString(10);
  }

  /**
   * Calculate minimum stake currency required.
   *
   * @sets oThis.responseData.minimum_stake_currency_required
   *
   * @return {Promise<never>}
   */
  async calculateMinimumStakeCurrencyRequired() {
    const oThis = this;

    // (1 / conversion_factor) * 10^(stake currency decimal values).
    const conversionFactor = oThis.token.conversionFactor,
      decimal = oThis.token.decimal,
      conversionFactorBN = new BigNumber(conversionFactor),
      oneAsBigNumber = new BigNumber('1'),
      tenAsBigNumber = new BigNumber('10'),
      minimumStakeCurrencyRequiredBN = oneAsBigNumber.div(conversionFactorBN),
      minimumStakeCurrencyRequiredInWei = minimumStakeCurrencyRequiredBN.mul(tenAsBigNumber.toPower(decimal));

    oThis.responseData.minimum_stake_currency_required = minimumStakeCurrencyRequiredInWei.toString(10);
  }
}

module.exports = TokenMintDetails;
