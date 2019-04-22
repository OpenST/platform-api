/**
 * Module to create origin stable coin deployer address.
 *
 * @module executables/oneTimers/stableCoinStaking/createOriginStableCoinDeployerAddress
 */

const program = require('commander');

const rootPrefix = '../../..',
  TransferEth = require(rootPrefix + '/lib/fund/eth/Transfer'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  GenerateChainKnownAddresses = require(rootPrefix + '/tools/helpers/GenerateChainKnownAddresses'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  fundingConfig = require(rootPrefix + '/config/funding'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

program.option('--originChainId <originChainId>', 'origin chainId').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/oneTimers/stableCoinStaking/createOriginStableCoinDeployerAddress.js --originChainId 3'
  );
  logger.log('');
  logger.log('');
});

if (!program.originChainId) {
  program.help();
  process.exit(1);
}

// Declare variables.
const originMaxGasPriceMultiplierWithBuffer = basicHelper.getOriginMaxGasPriceMultiplierWithBuffer();

/**
 * Class to create origin stable coin deployer address.
 *
 * @class CreateOriginStableCoinDeployerAddress
 */
class CreateOriginStableCoinDeployerAddress {
  /**
   * Constructor to create origin stable coin deployer address.
   *
   * @param {number} originChainId
   *
   * @constructor
   */
  constructor(originChainId) {
    const oThis = this;

    oThis.chainKind = coreConstants.originChainKind;
    oThis.originChainId = originChainId;
  }
  /**
   * Main performer method for the class.
   *
   * @returns {Promise<void>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(`${__filename}::perform`);

      return responseHelper.error({
        internal_error_identifier: 'e_ot_scs_coscda_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err
      });
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    logger.log('* Generating address originStableCoinDeployerKind.');

    // Generate address.
    const addressesResp = await oThis._generateAddresses([chainAddressConstants.originStableCoinDeployerKind]);

    if (addressesResp.isSuccess()) {
      const addresses = addressesResp.data.addresses;

      const amountToFundOriginGasMap = fundingConfig[chainAddressConstants.masterInternalFunderKind].originGas,
        amountForOriginStableCoinDeployer =
          amountToFundOriginGasMap[chainAddressConstants.originStableCoinDeployerKind].fundAmount;

      logger.log(
        `* Funding origin stable coin deployer address (${
          addresses[chainAddressConstants.originStableCoinDeployerKind]
        }) with ETH.`
      );

      await oThis._fundAddressWithEth(
        addresses[chainAddressConstants.originStableCoinDeployerKind],
        amountForOriginStableCoinDeployer
      );
    }
  }

  /**
   * Generate addresses required for chain.
   *
   * @param {array} addressKinds: List of address kinds to generate.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _generateAddresses(addressKinds) {
    const oThis = this;

    const generateChainKnownAddresses = new GenerateChainKnownAddresses({
      addressKinds: addressKinds,
      chainKind: oThis.chainKind,
      chainId: oThis.originChainId
    });

    const generateAddrRsp = await generateChainKnownAddresses.perform();

    if (generateAddrRsp.isFailure()) {
      logger.error(`Address generation failed for chain kind: ${oThis.chainKind} -- chain id: ${oThis.originChainId}`);

      return responseHelper.error({
        internal_error_identifier: 'e_ot_scs_coscda_2',
        api_error_identifier: 'something_went_wrong',
        debug_options: {}
      });
    }

    logger.info('Generate Addresses Response: ', generateAddrRsp.toHash());

    const addresses = generateAddrRsp.data.addressKindToValueMap;

    return responseHelper.successWithData({ addresses: addresses });
  }

  /**
   * Fetch master internal funder address.
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchMasterInternalFunderAddress() {
    // Fetch all addresses from origin chain addresses
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_ot_scs_coscda_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return chainAddressesRsp.data[chainAddressConstants.masterInternalFunderKind].address;
  }

  /**
   * Fund address with ETH.
   *
   * @param {string} toAddress: address to fund ETH to
   * @param {string} amount: amount in eth which is to be funded
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fundAddressWithEth(toAddress, amount) {
    const oThis = this;

    const amountInWei = basicHelper
      .convertToWei(String(amount))
      .mul(basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer))
      .toString(10);

    await new TransferEth({
      toAddress: toAddress,
      fromAddress: await oThis._fetchMasterInternalFunderAddress(),
      amountInWei: amountInWei,
      waitTillReceipt: 1,
      originChainId: oThis.originChainId
    }).perform();
  }
}

new CreateOriginStableCoinDeployerAddress(program.originChainId)
  .perform()
  .then(() => {
    console.log('One-timer finished');
    process.exit(0);
  })
  .catch(() => {
    console.log('One-timer failed.');
    process.exit(1);
  });
