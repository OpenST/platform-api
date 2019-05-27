/**
 * Module to fund origin stable coin deployer address.
 *
 * @module executables/oneTimers/stakeCurrencies2.1/fundOriginStableCoinDeployerAddress
 */

const program = require('commander');

const rootPrefix = '../../..',
  TransferEth = require(rootPrefix + '/lib/fund/eth/Transfer'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
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
    '    node executables/oneTimers/stakeCurrencies2.1/fundOriginStableCoinDeployerAddress.js --originChainId 3'
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
 * @class FundOriginStableCoinDeployerAddress
 */
class FundOriginStableCoinDeployerAddress {
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

    logger.log('* fetching address originStableCoinDeployerKind.');
    await oThis._fetchChainAddresses();

    const amountToFundOriginGasMap = fundingConfig[chainAddressConstants.masterInternalFunderKind].originGas,
      amountForOriginStableCoinDeployer =
        amountToFundOriginGasMap[chainAddressConstants.originStableCoinDeployerKind].fundAmount;

    logger.log(`* Funding origin stable coin deployer address (${oThis.stableCoinDeployerAddress}) with ETH.`);

    await oThis._fundAddressWithEth(oThis.stableCoinDeployerAddress, amountForOriginStableCoinDeployer);
  }

  /**
   * Fetch master internal funder address.
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchChainAddresses() {
    const oThis = this;
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

    oThis.masterInternalFunderAddress = chainAddressesRsp.data[chainAddressConstants.masterInternalFunderKind].address;
    oThis.stableCoinDeployerAddress =
      chainAddressesRsp.data[chainAddressConstants.originStableCoinDeployerKind].address;
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
      .convertToLowerUnit(String(amount), coreConstants.ETH_DECIMALS)
      .mul(basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer))
      .toString(10);

    let rsp = await new TransferEth({
      toAddress: toAddress,
      fromAddress: oThis.masterInternalFunderAddress,
      amountInWei: amountInWei,
      waitTillReceipt: 1,
      originChainId: oThis.originChainId
    }).perform();

    console.log('Transaction Receipt', rsp);
  }
}

new FundOriginStableCoinDeployerAddress(program.originChainId)
  .perform()
  .then(() => {
    logger.log('One-timer finished');
    process.exit(0);
  })
  .catch((err) => {
    logger.log('One-timer failed.', err);
    process.exit(1);
  });
