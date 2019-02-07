'use strict';
/**
 * Generate address for Origin and Auxiliary chains
 *
 * @module devops/utils/GenerateAddress
 */

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ChainAddressBase = require(rootPrefix + '/devops/utils/chainAddress/Base'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

/**
 * Class for Generating addresses for origin chains
 *
 * @class
 */
class GenerateOriginAddress extends ChainAddressBase {
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

    let addressKinds = [
      chainAddressConstants.originDeployerKind,
      //chainAddressConstants.masterInternalFunderKind,

      chainAddressConstants.stOrgContractOwnerKind,
      chainAddressConstants.originAnchorOrgContractOwnerKind,

      chainAddressConstants.stOrgContractAdminKind,
      chainAddressConstants.originAnchorOrgContractAdminKind,

      chainAddressConstants.stOrgContractWorkerKind,
      chainAddressConstants.originAnchorOrgContractWorkerKind,

      chainAddressConstants.originDefaultBTOrgContractAdminKind,
      chainAddressConstants.originDefaultBTOrgContractWorkerKind
    ];

    logger.log('* Generating address originDeployerKind.');
    //logger.log('* Generating address masterInternalFunderKind.');
    logger.log('* Generating address stOrgContractOwnerKind.');
    logger.log('* Generating address originAnchorOrgContractOwnerKind.');
    logger.log('* Generating address stOrgContractAdminKind.');
    logger.log('* Generating address originAnchorOrgContractAdminKind.');
    logger.log('* Generating address stOrgContractWorkerKind.');
    logger.log('* Generating address originAnchorOrgContractWorkerKind.');
    logger.log('* Generating address originDefaultBTOrgContractAdminKind.');
    logger.log('* Generating address originDefaultBTOrgContractWorkerKind.');

    let addressesResp = await oThis._generateAddresses(addressKinds);

    if (addressesResp.isSuccess()) {
      let addresses = addressesResp['data']['addresses'];

      logger.log(
        `* Funding origin deployer address (${addresses[chainAddressConstants.originDeployerKind]}) with ETH.`
      );
      await oThis._fundAddressWithEth(addresses[chainAddressConstants.originDeployerKind], 0.0072);
    }

    return addressesResp;
  }
}

module.exports = GenerateOriginAddress;
