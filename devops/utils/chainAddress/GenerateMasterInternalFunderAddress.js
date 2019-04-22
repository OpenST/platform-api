/**
 * Module to generate master internal funder address for this env.
 *
 * @module devops/utils/chainAddress/GenerateMasterInternalFunderAddress
 */

const rootPrefix = '../../..',
  ChainAddressBase = require(rootPrefix + '/devops/utils/chainAddress/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

/**
 * Class to generate master internal funder address for this env.
 *
 * @class GenerateMasterInternalFunderAddress
 */
class GenerateMasterInternalFunderAddress extends ChainAddressBase {
  /**
   * Constructor to generate master internal funder address for this env.
   *
   * @param {number} chainId
   *
   * @augments ChainAddressBase
   *
   * @constructor
   */
  constructor(chainId) {
    super(chainId);

    const oThis = this;

    oThis.chainKind = coreConstants.originChainKind;
  }

  /**
   * Async perform.
   *
   * @return {Promise<result>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    const addressKinds = [chainAddressConstants.masterInternalFunderKind];

    logger.log('* Generating address masterInternalFunderKind.');

    return oThis._generateAddresses(addressKinds);
  }
}

module.exports = GenerateMasterInternalFunderAddress;
