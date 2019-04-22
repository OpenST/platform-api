/**
 * Module to generate address for auxiliary chains.
 *
 * @module devops/utils/GenerateAddress
 */

const rootPrefix = '../../..',
  ChainAddressBase = require(rootPrefix + '/devops/utils/chainAddress/Base'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  fundingConfig = require(rootPrefix + '/config/funding'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

/**
 * Class for generating addresses for auxiliary chains.
 *
 * @class GenerateAuxAddress
 */
class GenerateAuxAddress extends ChainAddressBase {
  /**
   * Constructor for generating addresses for auxiliary chains.
   *
   * @param {number} chainId: aux chain Id.
   *
   * @constructor
   */
  constructor(chainId) {
    super(chainId);

    const oThis = this;

    oThis.chainKind = coreConstants.auxChainKind;
  }

  /**
   * Async perform.
   *
   * @return {Promise<result>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    // Generate addresses.
    const addressKinds = [
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

    const addresses = await oThis._generateAddresses(addressKinds);

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
   * @private
   */
  async _fetchOriginAddresses() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
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
   * @private
   */
  async _fundOriginAddresses() {
    const oThis = this;

    const amountToFundOriginGasMap = fundingConfig[chainAddressConstants.masterInternalFunderKind].originGas,
      amountForSTOrganizationOwner = amountToFundOriginGasMap[chainAddressConstants.stOrgContractOwnerKind].fundAmount,
      amountForOriginAnchorContractOwner =
        amountToFundOriginGasMap[chainAddressConstants.originAnchorOrgContractOwnerKind].fundAmount;

    logger.log('* Funding st org contract owner address with ETH.');
    await oThis._fundAddressWithEth(oThis.stOrgContractOwnerAddress, amountForSTOrganizationOwner);

    logger.log('* Funding origin anchor org contract owner address with ETH.');
    await oThis._fundAddressWithEth(oThis.originAnchorOrgContractOwnerAddress, amountForOriginAnchorContractOwner);
  }
}

module.exports = GenerateAuxAddress;
