/**
 * Module to prove gateway in coGateway in branded token.
 *
 * @module lib/stakeAndMint/stPrime/ProveGateway
 */

const rootPrefix = '../../..',
  ProveGatewayBase = require(rootPrefix + '/lib/stakeAndMint/common/ProveGatewayBase'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to prove gateway in coGateway in branded token.
 *
 * @class ProveGatewayForBt
 */
class ProveGatewayForBt extends ProveGatewayBase {
  /**
   * Constructor to prove gateway in coGateway in branded token.
   *
   * @param {object} params
   * @param {number} params.currentWorkflowId: Current workflow id.
   * @param {number} params.tokenId: Token Id.
   * @param {number} params.auxChainId: Aux chain Id to prove gateway on.
   * @param {number} params.originChainId: Origin chain Id to prove gateway of.
   * @param {string} params.facilitator: Facilitator to help in proving.
   * @param {string} params.lastCommittedBlockNumber: Last committed block number on Anchor.
   * @param {boolean} [params.firstTimeMint]: First time mint or not (optional)
   *
   * @augments ProveGatewayBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;
  }

  /**
   * Fetch gateway addresses.
   *
   * @sets oThis.gatewayContract, oThis.coGatewayContract
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayAddresses() {
    const oThis = this;

    const tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.gatewayContract = addressesResp.data[tokenAddressConstants.tokenGatewayContract];
    oThis.coGatewayContract = addressesResp.data[tokenAddressConstants.tokenCoGatewayContract];
  }

  /**
   * Fetch aux chain gas price.
   *
   * @return {string}
   * @private
   */
  _fetchGasPrice() {
    return contractConstants.auxChainGasPrice;
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
      pendingTransactionKind: pendingTransactionConstants.proveGatewayOnCoGatewayKind
    };
  }
}

module.exports = ProveGatewayForBt;
