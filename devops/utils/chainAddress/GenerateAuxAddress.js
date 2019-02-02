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
    super();
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
      chainAddressConstants.auxDeployerKind,
      chainAddressConstants.interChainFacilitatorKind,

      chainAddressConstants.stPrimeOrgContractOwnerKind,
      chainAddressConstants.auxAnchorOrgContractOwnerKind,
      chainAddressConstants.auxPriceOracleContractOwnerKind,

      chainAddressConstants.stPrimeOrgContractAdminKind,
      chainAddressConstants.auxAnchorOrgContractAdminKind,
      chainAddressConstants.auxPriceOracleContractAdminKind,

      chainAddressConstants.stPrimeOrgContractWorkerKind,
      chainAddressConstants.auxAnchorOrgContractWorkerKind,
      chainAddressConstants.auxPriceOracleContractWorkerKind
    ];

    logger.log('* Generating address auxDeployerKind.');
    logger.log('* Generating address interChainFacilitatorKind.');
    logger.log('* Generating address stPrimeOrgContractOwnerKind.');
    logger.log('* Generating address auxAnchorOrgContractOwnerKind.');
    logger.log('* Generating address auxPriceOracleContractOwnerKind.');
    logger.log('* Generating address stPrimeOrgContractAdminKind.');
    logger.log('* Generating address auxAnchorOrgContractAdminKind.');
    logger.log('* Generating address auxPriceOracleContractAdminKind.');
    logger.log('* Generating address stPrimeOrgContractWorkerKind.');
    logger.log('* Generating address auxAnchorOrgContractWorkerKind.');
    logger.log('* Generating address auxPriceOracleContractWorkerKind.');

    let addresses = await oThis._generateAddresses(addressKinds);

    return addresses;
  }
}

module.exports = GenerateAuxAddress;
