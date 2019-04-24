/**
 * Module to grant Stake Currency to Partner companies in Sandbox ENV.
 *
 * @module lib/setup/grant/StakeCurrency
 */

const Bignumber = require('bignumber.js');

const rootPrefix = '../../..',
  GetErc20Balance = require(rootPrefix + '/lib/getBalance/Erc20'),
  TransferErc20Token = require(rootPrefix + '/lib/fund/erc20/Transfer'),
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  grantConstant = require(rootPrefix + '/lib/globalConstant/grant'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  conversionRatesConstants = require(rootPrefix + '/lib/globalConstant/conversionRates'),
  StakeCurrencyByIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyById'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to grant Stake Currency to Partner companies in Sandbox ENV.
 *
 * @class GrantStakeCurrency
 */
class GrantStakeCurrency {
  /**
   * Constructor to grant Stake Currency to Partner companies in Sandbox ENV.
   *
   * @param {object} params
   * @param {number} params.tokenId
   * @param {object} params.pendingTransactionExtraData
   * @param {number} params.clientId
   * @param {string} params.toAddress
   * @param {number} params.originChainId
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;
    oThis.clientId = params.clientId;
    oThis.toAddress = params.toAddress;
    oThis.originChainId = params.originChainId;

    oThis.token = null;
    oThis.stakeCurrencyDetails = null;
  }

  /**
   * Perform.
   *
   * @return {Promise<void>}
   * @private
   */
  async perform() {
    const oThis = this;

    await oThis._fetchTokenDetails();

    await oThis._fetchStakeCurrencyDetails();

    return oThis._performTransfers();
  }

  /**
   * Fetch token details
   *
   * @private
   */
  async _fetchTokenDetails() {
    const oThis = this;

    let cacheResponse = await new TokenCache({ clientId: oThis.clientId }).fetch();

    if (cacheResponse.isFailure()) {
      return Promise.reject(cacheResponse);
    }

    oThis.token = cacheResponse.data;

    if (basicHelper.isEmptyObject(oThis.token)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_g_o_1',
          api_error_identifier: 'token_not_setup',
          debug_options: {}
        })
      );
    }
  }

  /**
   * This function fetches stake currency details.
   *
   * @private
   */
  async _fetchStakeCurrencyDetails() {
    const oThis = this;

    let stakeCurrencyCacheResponse = await new StakeCurrencyByIdCache({
      stakeCurrencyIds: [oThis.token.stakeCurrencyId]
    }).fetch();

    if (stakeCurrencyCacheResponse.isFailure()) {
      return Promise.reject(stakeCurrencyCacheResponse);
    }

    oThis.stakeCurrencyDetails = stakeCurrencyCacheResponse.data[oThis.token.stakeCurrencyId];
  }

  /**
   * Perform transfers.
   *
   * @return {Promise<*>}
   * @private
   */
  async _performTransfers() {
    const oThis = this;

    if (basicHelper.isMainSubEnvironment()) {
      logger.info('Grants are not allowed in main sub env.');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_g_o_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: ''
        })
      );
    }

    const granterAddress = await oThis._fetchGranterAddress();

    let grantStakeCurrencyValue;

    if (oThis.stakeCurrencyDetails['symbol'] === conversionRatesConstants.OST) {
      grantStakeCurrencyValue = new Bignumber(grantConstant.grantOstValueInWei);
    } else if (oThis.stakeCurrencyDetails['symbol'] === conversionRatesConstants.USDC) {
      grantStakeCurrencyValue = new Bignumber(grantConstant.grantUsdcValueInWei);
    } else {
      fail`unsupported stakeCurrencyData symbol ${oThis.stakeCurrencyDetails['symbol']}`;
    }

    let grantStakeCurrencyValueBn = new Bignumber(grantStakeCurrencyValue);

    const stakeCurrencyBalances = await oThis._fetchStakeCurrencyBalance([granterAddress, oThis.toAddress]);

    const granterBalanceInWei = stakeCurrencyBalances[granterAddress],
      granterBalanceInWeiBn = new Bignumber(granterBalanceInWei);

    if (granterBalanceInWeiBn.lte(grantStakeCurrencyValueBn)) {
      logger.info('Granter does not have enough balance');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_g_o_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: ''
        })
      );
    }

    const granteeBalanceInWei = stakeCurrencyBalances[oThis.toAddress],
      granteeBalanceInWeiBn = new Bignumber(granteeBalanceInWei);

    if (granteeBalanceInWeiBn.gte(new Bignumber(grantStakeCurrencyValueBn))) {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      });
    }

    const fundAddressResponse = await new TransferErc20Token({
      tokenId: oThis.tokenId,
      pendingTransactionKind: pendingTransactionConstants.grantStakeCurrencyKind,
      toAddress: oThis.toAddress,
      fromAddress: granterAddress,
      amountInWei: grantStakeCurrencyValue,
      waitTillReceipt: 0,
      tokenSymbol: oThis.stakeCurrencyDetails['symbol'],
      pendingTransactionExtraData: oThis.pendingTransactionExtraData,
      originChainId: oThis.originChainId
    }).perform();

    const isTaskPending = fundAddressResponse.isSuccess() && fundAddressResponse.data.transactionHash;

    if (!isTaskPending) {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      });
    }

    return responseHelper.successWithData({
      transactionHash: fundAddressResponse.data.transactionHash,
      taskStatus: workflowStepConstants.taskPending,
      debugParams: oThis.txOptions
    });
  }

  /**
   * Fetch granter address.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGranterAddress() {
    // Fetch all addresses associated with origin chain id.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_g_o_4',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return chainAddressesRsp.data[chainAddressConstants.originGranterKind].address;
  }

  /**
   * Fetch Stable currency balance of addresses.
   *
   * @param {array} addresses
   *
   * @return {Promise<*>}
   * @private
   */
  async _fetchStakeCurrencyBalance(addresses) {
    const oThis = this;

    return new GetErc20Balance({
      originChainId: oThis.originChainId,
      addresses: addresses,
      contractAddress: oThis.stakeCurrencyDetails['contractAddress']
    }).perform();
  }
}

module.exports = GrantStakeCurrency;
