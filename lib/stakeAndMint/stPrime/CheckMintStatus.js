/**
 * Module to check mint status for StPrime.
 *
 * @module lib/stakeAndMint/stPrime/CheckMintStatus
 */

const rootPrefix = '../../..',
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  CheckMintStatusBase = require(rootPrefix + '/lib/stakeAndMint/common/CheckMintStatusBase'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

/**
 * Class to check mint status for StPrime.
 *
 * @class CheckMintStatusForStPrime
 */
class CheckMintStatusForStPrime extends CheckMintStatusBase {
  /**
   * Constructor to check mint status for StPrime.
   *
   * @param {object} params
   * @param {string/number} params.chainId
   * @param {string} params.transactionHash
   * @param {string} params.messageHash
   * @param {string} params.currentStep
   * @param {string/number} params.auxChainId
   * @param {string/number} params.originChainId
   *
   * @augments CheckMintStatusBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.auxChainId = params.auxChainId;
  }

  /**
   * Fetch Gateway and CoGateway addresses.
   *
   * @sets oThis.gatewayContract, oThis.coGatewayContract
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayAddresses() {
    const oThis = this;

    // Fetch gateway contract address
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.gatewayContract = chainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;
    oThis.coGatewayContract = chainAddressesRsp.data[chainAddressConstants.auxCoGatewayContractKind].address;
  }
}

module.exports = CheckMintStatusForStPrime;
