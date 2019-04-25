/**
 * Module to progress stake of StPrime.
 *
 * @module lib/stakeAndMint/stPrime/ProgressStake
 */

const rootPrefix = '../../..',
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  ProgressStakeBase = require(rootPrefix + '/lib/stakeAndMint/common/ProgressStakeBase'),
  DynamicGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to progress stake of StPrime.
 *
 * @class ProgressStakeForStPrime
 */
class ProgressStakeForStPrime extends ProgressStakeBase {
  /**
   * Constructor to progress stake of branded token.
   *
   * @param {object} params
   * @param {string/number} params.originChainId
   * @param {string/number} params.auxChainId
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

    oThis.auxChainId = params.auxChainId;
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

    // Fetch gateway contract address.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.gatewayContract = chainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;
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
    return {
      pendingTransactionKind: pendingTransactionConstants.progressStakeKind
    };
  }
}

module.exports = ProgressStakeForStPrime;
