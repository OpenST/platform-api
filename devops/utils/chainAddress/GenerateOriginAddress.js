/**
 * Module to generate addresses for origin chain.
 *
 * @module devops/utils/GenerateAddress
 */

const rootPrefix = '../../..',
  ChainAddressBase = require(rootPrefix + '/devops/utils/chainAddress/Base'),
  fundingConfig = require(rootPrefix + '/config/funding'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

/**
 * Class for generating addresses for origin chain.
 *
 * @class GenerateOriginAddress
 */
class GenerateOriginAddress extends ChainAddressBase {
  /**
   * Constructor for generating addresses for origin chain.
   *
   * @param {number} chainId: origin chain Id.
   *
   * @augments ChainAddressBase
   *
   * @constructor
   */
  constructor(chainId) {
    super(chainId);

    const oThis = this;

    oThis.originChainId = chainId;
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

    const addressKinds = [
      chainAddressConstants.originDeployerKind,

      chainAddressConstants.stOrgContractOwnerKind,
      chainAddressConstants.originAnchorOrgContractOwnerKind,

      chainAddressConstants.stOrgContractAdminKind,
      chainAddressConstants.originAnchorOrgContractAdminKind,

      chainAddressConstants.stOrgContractWorkerKind,
      chainAddressConstants.originAnchorOrgContractWorkerKind,

      chainAddressConstants.originDefaultBTOrgContractAdminKind,
      chainAddressConstants.originDefaultBTOrgContractWorkerKind,

      chainAddressConstants.originStableCoinDeployerKind
    ];

    logger.log('* Generating address originDeployerKind.');
    logger.log('* Generating address stOrgContractOwnerKind.');
    logger.log('* Generating address originAnchorOrgContractOwnerKind.');
    logger.log('* Generating address stOrgContractAdminKind.');
    logger.log('* Generating address originAnchorOrgContractAdminKind.');
    logger.log('* Generating address stOrgContractWorkerKind.');
    logger.log('* Generating address originAnchorOrgContractWorkerKind.');
    logger.log('* Generating address originDefaultBTOrgContractAdminKind.');
    logger.log('* Generating address originDefaultBTOrgContractWorkerKind.');
    logger.log('* Generating address originStableCoinDeployerKind.');

    const addressesResp = await oThis._generateAddresses(addressKinds);

    if (addressesResp.isSuccess()) {
      const addresses = addressesResp.data.addresses,
        promises = [];

      const amountToFundOriginGasMap = fundingConfig[chainAddressConstants.masterInternalFunderKind].originGas,
        amountForOriginDeployer = amountToFundOriginGasMap[chainAddressConstants.originDeployerKind].fundAmount,
        amountForOriginStableCoinDeployer =
          amountToFundOriginGasMap[chainAddressConstants.originStableCoinDeployerKind].fundAmount;

      logger.log(
        `* Funding origin deployer address (${addresses[chainAddressConstants.originDeployerKind]}) with ETH.`
      );
      promises.push(
        oThis._fundAddressWithEth(addresses[chainAddressConstants.originDeployerKind], amountForOriginDeployer)
      );
      logger.log(
        `* Funding origin stable coin deployer address (${
          addresses[chainAddressConstants.originDeployerKind]
        }) with ETH.`
      );
      promises.push(
        oThis._fundAddressWithEth(
          addresses[chainAddressConstants.originStableCoinDeployerKind],
          amountForOriginStableCoinDeployer
        )
      );

      await Promise.all(promises);
    }

    return addressesResp;
  }
}

module.exports = GenerateOriginAddress;
