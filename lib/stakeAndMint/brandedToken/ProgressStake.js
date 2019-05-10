/**
 * Module to progress stake of branded token.
 *
 * @module lib/stakeAndMint/brandedToken/ProgressStake
 */

const rootPrefix = '../../..',
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ProgressStakeBase = require(rootPrefix + '/lib/stakeAndMint/common/ProgressStakeBase'),
  DynamicGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to progress stake of branded token.
 *
 * @class ProgressStakeForBt
 */
class ProgressStakeForBt extends ProgressStakeBase {
  /**
   * Constructor to progress stake of branded token.
   *
   * @param {object} params
   * @param {string/number} params.originChainId
   * @param {string/number} params.tokenId
   * @param {string} params.facilitator
   * @param {string} params.secretString
   * @param {string} params.messageHash
   *
   * @augments ProgressStakeBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;
  }

  /**
   * Fetch gateway contract.
   *
   * @sets oThis.gatewayContract
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayContract() {
    const oThis = this;

    const tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.gatewayContract = addressesResp.data[tokenAddressConstants.tokenGatewayContract];
  }

  /**
   * Get origin chain dynamic gas price.
   *
   * @return {Promise<*>}
   * @private
   */
  async _fetchGasPrice() {
    const dynamicGasPriceResponse = await new DynamicGasPriceCache().fetch();

    return dynamicGasPriceResponse.data;
  }

  /**
   * Get submit transaction parameters.
   *
   * @return {object}
   */
  get _customSubmitTxParams() {
    const oThis = this;

    return {
      tokenId: oThis.tokenId,
      pendingTransactionKind: pendingTransactionConstants.progressStakeKind
    };
  }
}

module.exports = ProgressStakeForBt;
