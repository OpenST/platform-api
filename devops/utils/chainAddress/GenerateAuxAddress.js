'use strict';

/**
 * Generate address for Origin and Auxiliary chains
 *
 * @module devops/utils/GenerateAddress
 */
const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressBase = require(rootPrefix + '/devops/utils/chainAddress/Base');

/**
 * Class for Generating addresses for Origin and Auxiliary chains
 *
 * @class
 */
class GenerateAuxAddress extends ChainAddressBase {
  /**
   * Constructor
   *
   * @param chainId
   *
   * @constructor
   */
  constructor(chainId) {
    super(chainId);
    const oThis = this;

    oThis.chainId = chainId;
    oThis.chainKind = coreConstants.auxChainKind;
  }

  /**
   *
   * async perform
   *
   * @return {Promise<result>}
   *
   */
  async _asyncPerform() {
    const oThis = this;

    let addressKinds = [
      chainAddressConstants.deployerKind,
      chainAddressConstants.ownerKind,
      chainAddressConstants.adminKind,
      chainAddressConstants.workerKind
    ];

    logger.log('* Generating address for aux  deployer.');
    logger.log('* Generating address for aux  owner.');
    logger.log('* Generating address for aux  admin.');
    logger.log('* Generating address for aux  worker.');

    let addresses = await oThis._generateAddresses(addressKinds);

    return addresses;
  }
}

module.exports = GenerateAuxAddress;
