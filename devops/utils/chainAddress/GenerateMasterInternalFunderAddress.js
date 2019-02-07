'use strict';
/**
 * Generate master internal funder address for this env
 *
 * @module devops/utils/chainAddress/GenerateMasterInternalFunderAddress
 */

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ChainAddressBase = require(rootPrefix + '/devops/utils/chainAddress/Base'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

/**
 * Class for generate master internal funder address for this env
 *
 * @class
 */
class GenerateMasterInternalFunderAddress extends ChainAddressBase {
  /**
   * Constructor
   *
   * @param {Number} chainId
   *
   * @constructor
   */
  constructor(chainId) {
    super(chainId);
    const oThis = this;

    oThis.chainId = chainId;
    oThis.chainKind = coreConstants.originChainKind;
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

    let addressKinds = [chainAddressConstants.masterInternalFunderKind];

    logger.log('* Generating address masterInternalFunderKind.');

    let addressesResp = await oThis._generateAddresses(addressKinds);

    return addressesResp;
  }
}

module.exports = GenerateMasterInternalFunderAddress;
