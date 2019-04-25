/**
 * Module to prove gateway in coGateway in StPrime.
 *
 * @module lib/stakeAndMint/stPrime/ProveGateway
 */

const rootPrefix = '../../..',
  ProveGatewayBase = require(rootPrefix + '/lib/stakeAndMint/common/ProveGatewayBase'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to prove gateway in coGateway in StPrime.
 *
 * @class ProveGatewayForStPrime
 */
class ProveGatewayForStPrime extends ProveGatewayBase {
  /**
   * Constructor to prove gateway in coGateway in StPrime.
   *
   * @param {object} params
   * @param {number} params.currentWorkflowId: Current workflow id.
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

    oThis.firstTimeMint = params.firstTimeMint;
    oThis.gatewayContract = '';
    oThis.coGatewayContract = '';
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

    // Fetch gateway contract addresses.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.gatewayContract = chainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;
    oThis.coGatewayContract = chainAddressesRsp.data[chainAddressConstants.auxCoGatewayContractKind].address;
  }

  /**
   * Fetch aux chain gas price.
   *
   * @return {string}
   * @private
   */
  _fetchGasPrice() {
    const oThis = this;

    // If firstTimeMint is true, gas price is set to '0x0', else default aux chain gas price is used.
    return oThis.firstTimeMint ? contractConstants.zeroGasPrice : contractConstants.auxChainGasPrice;
  }

  /**
   * Get submit transaction parameters.
   *
   * @return {object}
   */
  get _customSubmitTxParams() {
    return {
      pendingTransactionKind: pendingTransactionConstants.proveGatewayOnCoGatewayKind
    };
  }
}

module.exports = ProveGatewayForStPrime;
