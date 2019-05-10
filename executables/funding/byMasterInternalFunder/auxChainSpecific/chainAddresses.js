/**
 * Cron to fund stPrime by chainOwner to chain specific addresses.
 *
 * by: Master Internal Funder
 * to: [interChainFacilitatorKind, auxAnchorOrgContractAdminKind, auxDeployerKind, auxPriceOracleContractWorkerKind]
 * what: St Prime
 *
 * @module executables/funding/byMasterInternalFunder/auxChainSpecific/chainAddresses
 *
 * This cron expects originChainId and auxChainId as parameter in the params.
 */
const program = require('commander');

const rootPrefix = '../../../..',
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  AuxChainSpecificFundingCronBase = require(rootPrefix +
    '/executables/funding/byMasterInternalFunder/auxChainSpecific/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  fundingAmounts = require(rootPrefix + '/config/funding'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/funding/byMasterInternalFunder/auxChainSpecific/chainAddresses.js --cronProcessId 12'
  );
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

// Declare variables.
const auxMaxGasPriceMultiplierWithBuffer = basicHelper.getAuxMaxGasPriceMultiplierWithBuffer(),
  fundingAmountsAuxGasMap = fundingAmounts[chainAddressConstants.masterInternalFunderKind].auxGas;

// Config for addresses which need to be funded per chain by OST Prime
const stPrimeFundingPerChainConfig = {
  [chainAddressConstants.interChainFacilitatorKind]: {
    oneGWeiMinOSTPrimeAmount: fundingAmountsAuxGasMap[chainAddressConstants.interChainFacilitatorKind].fundAmount,
    thresholdAmount: fundingAmountsAuxGasMap[chainAddressConstants.interChainFacilitatorKind].thresholdAmount
  },
  [chainAddressConstants.auxAnchorOrgContractAdminKind]: {
    oneGWeiMinOSTPrimeAmount: fundingAmountsAuxGasMap[chainAddressConstants.auxAnchorOrgContractAdminKind].fundAmount,
    thresholdAmount: fundingAmountsAuxGasMap[chainAddressConstants.auxAnchorOrgContractAdminKind].thresholdAmount
  },
  [chainAddressConstants.auxDeployerKind]: {
    oneGWeiMinOSTPrimeAmount: fundingAmountsAuxGasMap[chainAddressConstants.auxDeployerKind].fundAmount,
    thresholdAmount: fundingAmountsAuxGasMap[chainAddressConstants.auxDeployerKind].thresholdAmount
  },
  [chainAddressConstants.auxPriceOracleContractWorkerKind]: {
    oneGWeiMinOSTPrimeAmount:
      fundingAmountsAuxGasMap[chainAddressConstants.auxPriceOracleContractWorkerKind].fundAmount,
    thresholdAmount: fundingAmountsAuxGasMap[chainAddressConstants.auxPriceOracleContractWorkerKind].thresholdAmount
  }
};

/**
 * Class to fund St Prime by chain owner to chain specific addresses.
 *
 * @class fundByMasterInternalFunderAuxChainSpecificChainAddresses
 */
class fundByMasterInternalFunderAuxChainSpecificChainAddresses extends AuxChainSpecificFundingCronBase {
  /**
   * Constructor to fund stPrime by chain owner to chain specific addresses.
   *
   * @params {object} params
   *
   * @augments AuxChainSpecificFundingCronBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Cron kind
   *
   * @return {String}
   *
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.fundByMasterInternalFunderAuxChainSpecificChainAddresses;
  }

  /**
   * Send ST Prime funds on all aux chains
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _sendFundsIfNeeded() {
    const oThis = this;

    const auxChainId = oThis.auxChainId;

    logger.step('Re-initiating variables for auxChainId: ' + auxChainId);
    let perChainFundingConfig = null;
    oThis.addressesToKindMap = {};

    logger.step('Fetching chain specific addresses and populating funding config');
    perChainFundingConfig = await oThis._createDuplicateChainFundingConfigFor(auxChainId);

    const addresses = Object.keys(oThis.addressesToKindMap);

    if (addresses.length === 0) {
      logger.error('No chain addresses found on auxChainId: ', auxChainId);

      return;
    }

    logger.step('Fetching balances for chain addresses on auxChainId: ' + auxChainId);
    const addressesToBalanceMap = await oThis._fetchStPrimeBalance(auxChainId, addresses);

    for (const address in addressesToBalanceMap) {
      const balance = addressesToBalanceMap[address],
        addressKind = oThis.addressesToKindMap[address];
      perChainFundingConfig[addressKind].balance = balance;
    }

    logger.step('Check if master internal funder has some threshold amount of balance.');
    const stPrimeForOneSetup = oThis._checkThresholdAmountForMif();
    logger.debug('Threshold balance', stPrimeForOneSetup);
    await oThis._isMIFStPrimeBalanceGreaterThan(stPrimeForOneSetup);

    logger.step('Fund chain specific addresses with StPrime if needed');
    await oThis._checkEligibilityAndTransferFunds(auxChainId, perChainFundingConfig);
  }

  /**
   * Create local copy of chain funding config for specific chain id
   *
   * @param {Number} auxChainId: aux chain id
   *
   * @return {Object} perChainFundingConfig
   *
   * @private
   */
  async _createDuplicateChainFundingConfigFor(auxChainId) {
    const oThis = this;

    const perChainFundingConfig = basicHelper.deepDup(stPrimeFundingPerChainConfig);

    logger.step('Fetching addresses on auxChainId: ' + auxChainId);
    const chainAddressesRsp = await oThis._fetchAddressesForChain(auxChainId);

    // Populate Address in fund config
    for (const addressKind in perChainFundingConfig) {
      let address = null;
      if (!chainAddressesRsp.data[addressKind]) {
        logger.error('** Address not found for addressKind: ', addressKind, ' on aux chain Id: ', auxChainId);
        continue;
      }
      if (chainAddressConstants.nonUniqueKinds.includes(addressKind)) {
        address = chainAddressesRsp.data[addressKind][0].address;
      } else {
        address = chainAddressesRsp.data[addressKind].address;
      }
      perChainFundingConfig[addressKind].address = address;
      oThis.addressesToKindMap[address] = addressKind;
    }

    return perChainFundingConfig;
  }

  /**
   * Fetch all the required addresses for the specific chainId.
   *
   * @param {Number} auxChainId
   *
   * @return {Promise<Array>}
   *
   * @private
   */
  async _fetchAddressesForChain(auxChainId) {
    // Fetch all addresses associated to auxChainId.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_f_bco_acs_ca_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return chainAddressesRsp;
  }

  /**
   * Check if chain addresses are eligible for funding and transfer them funds.
   *
   * @param {Number} auxChainId
   * @param {Object} perChainFundingConfig
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _checkEligibilityAndTransferFunds(auxChainId, perChainFundingConfig) {
    const oThis = this;

    const transferDetails = [];
    let totalAmountToTransferFromMIF = basicHelper.convertToBigNumber(0);

    for (const addressKind in perChainFundingConfig) {
      const fundingAddressDetails = perChainFundingConfig[addressKind],
        address = fundingAddressDetails.address,
        balance = fundingAddressDetails.balance;

      if (!address || !balance) {
        logger.error(
          '** Address or balance not found for addressKind: ',
          addressKind,
          ' on aux chain Id: ',
          auxChainId
        );
        continue;
      }

      const addressFundAmount = basicHelper
          .convertToLowerUnit(String(fundingAddressDetails.oneGWeiMinOSTPrimeAmount), coreConstants.OSTPRIME_DECIMALS)
          .mul(basicHelper.convertToBigNumber(auxMaxGasPriceMultiplierWithBuffer)),
        addressCurrentBalance = basicHelper.convertToBigNumber(balance),
        addressThresholdAmount = basicHelper
          .convertToLowerUnit(String(fundingAddressDetails.thresholdAmount), coreConstants.OSTPRIME_DECIMALS)
          .mul(basicHelper.convertToBigNumber(auxMaxGasPriceMultiplierWithBuffer));

      logger.log('\n\nAddress: ', address);
      logger.log('Current balance of address: ', addressCurrentBalance.toString(10));
      logger.log('Max funding amount of address: ', addressFundAmount.toString(10));
      logger.log('Threshold Amount for address: ', addressThresholdAmount.toString(10));

      if (addressCurrentBalance.lt(addressThresholdAmount)) {
        const amountToBeTransferredBN = addressFundAmount.minus(addressCurrentBalance),
          transferParams = {
            fromAddress: oThis.masterInternalFunderAddress,
            toAddress: address,
            amountInWei: amountToBeTransferredBN.toString(10)
          };
        logger.log('Funds transferred are: ', amountToBeTransferredBN.toString(10));
        transferDetails.push(transferParams);
        totalAmountToTransferFromMIF = totalAmountToTransferFromMIF.plus(amountToBeTransferredBN);
      }
    }

    logger.step('Transferring StPrime to addresses on auxChainId: ' + auxChainId);

    // Start transfer.
    oThis.canExit = false;

    if (transferDetails.length > 0 && (await oThis._isMIFStPrimeBalanceGreaterThan(totalAmountToTransferFromMIF))) {
      await oThis._transferStPrime(auxChainId, transferDetails);
    }
    oThis.canExit = true;
  }
}

logger.log('Starting cron to fund StPrime to chain addresses by chainOwner.');

new fundByMasterInternalFunderAuxChainSpecificChainAddresses({ cronProcessId: +program.cronProcessId })
  .perform()
  .then(function() {
    process.emit('SIGINT');
  })
  .catch(function() {
    process.emit('SIGINT');
  });
