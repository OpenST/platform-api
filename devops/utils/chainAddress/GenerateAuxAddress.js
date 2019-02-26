'use strict';

/**
 * Generate address for Origin and Auxiliary chains
 *
 * @module devops/utils/GenerateAddress
 */
const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
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

    oThis.chainId = chainId; //Aux Chain Id
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

    // Generate addresses.
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

    logger.step('Fetching required origin addresses to fund eth.');
    await oThis._fetchOriginAddresses();

    logger.step('Funding required origin addresses to fund eth.');
    await oThis._fundOriginAddresses();

    return addresses;
  }

  /**
   * Fetch required origin addresses.
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _fetchOriginAddresses() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'd_u_ca_gaa_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.originDeployerAddress = chainAddressesRsp.data[chainAddressConstants.originDeployerKind].address;
    oThis.stOrgContractOwnerAddress = chainAddressesRsp.data[chainAddressConstants.stOrgContractOwnerKind].address;
    oThis.originAnchorOrgContractOwnerAddress =
      chainAddressesRsp.data[chainAddressConstants.originAnchorOrgContractOwnerKind].address;
  }

  /**
   * Fund origin addresses with eth.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fundOriginAddresses() {
    const oThis = this;

    logger.log('* Funding origin deployer address with ETH.');
    await oThis._fundAddressWithEth(oThis.originDeployerAddress, 0.0069); //TODO-FUNDING:

    logger.log('* Funding st org contract owner address with ETH.');
    await oThis._fundAddressWithEth(oThis.stOrgContractOwnerAddress, 0.00012); //TODO-FUNDING:

    logger.log('* Funding origin anchor org contract owner address with ETH.');
    await oThis._fundAddressWithEth(oThis.originAnchorOrgContractOwnerAddress, 0.00006); //TODO-FUNDING:
  }
}

module.exports = GenerateAuxAddress;
