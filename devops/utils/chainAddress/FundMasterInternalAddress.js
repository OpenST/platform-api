'use strict';
/**
 * Fund master internal address with ETH from external private key
 *
 * @module devops/utils/chainAddress/FundMasterInternalAddress
 */

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ChainAddressBase = require(rootPrefix + '/devops/utils/chainAddress/Base'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

/**
 * Class to fund master internal address with ETH from external private key
 *
 * @class
 */
class FundMasterInternalAddress extends ChainAddressBase {
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

module.exports = FundMasterInternalAddress;
