'use strict';
/**
 * Cron to fund stPrime by chainOwner to chain specific addresses.
 *
 * @module executables/funding/byMasterInternalFunder/auxChainSpecific/chainAddresses
 *
 * This cron expects originChainId and auxChainIds as parameter in the params.
 */
const program = require('commander');

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  AuxChainSpecificFundingCronBase = require(rootPrefix +
    '/executables/funding/byMasterInternalFunder/auxChainSpecific/Base');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/funding/byMasterInternalFunder/auxChainSpecific/chainAddresses.js --cronProcessId 10'
  );
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

// Declare variables.
const flowsForMinimumBalance = basicHelper.convertToBigNumber(coreConstants.FLOWS_FOR_MINIMUM_BALANCE),
  flowsForTransferBalance = basicHelper.convertToBigNumber(coreConstants.FLOWS_FOR_TRANSFER_BALANCE),
  originMaxGasPriceMultiplierWithBuffer = basicHelper.getOriginMaxGasPriceMultiplierWithBuffer();

// Config for addresses which need to be funded per chain by OST Prime
const stPrimeFundingPerChainConfig = {
  [chainAddressConstants.interChainFacilitatorKind]: {
    oneGWeiMinOSTPrimeAmount: '0.02840',
    fundForFlows: flowsForTransferBalance,
    fundIfLessThanFlows: flowsForMinimumBalance
  },
  [chainAddressConstants.auxAnchorOrgContractAdminKind]: {
    oneGWeiMinOSTPrimeAmount: '0.00030',
    fundForFlows: flowsForTransferBalance,
    fundIfLessThanFlows: flowsForMinimumBalance
  },
  [chainAddressConstants.auxDeployerKind]: {
    oneGWeiMinOSTPrimeAmount: '0.00840',
    fundForFlows: flowsForTransferBalance,
    fundIfLessThanFlows: flowsForMinimumBalance
  }
};

/**
 * Class to fund St Prime by chain owner to chain specific addresses.
 *
 * @class
 */
class FundByChainOwnerAuxChainSpecificChainAddresses extends AuxChainSpecificFundingCronBase {
  /**
   * Constructor to fund stPrime.
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.canExit = true;
  }

  /**
   * Cron kind
   *
   * @return {String}
   *
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.fundByChainOwnerAuxChainSpecificChainAddresses;
  }

  /**
   * Pending tasks done
   *
   * @return {Boolean}
   *
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
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

    // Loop over all auxChainIds.
    for (let index = 0; index < oThis.auxChainIds.length; index++) {
      let auxChainId = oThis.auxChainIds[index];

      logger.step('Re-initiating variables for auxChainId: ' + auxChainId);
      let perChainFundingConfig = null;
      oThis.addressesToKindMap = {};

      logger.step('Fetching chain specific addresses and populating funding config');
      perChainFundingConfig = await oThis._createDuplicateChainFundingConfigFor(auxChainId);

      let addresses = Object.keys(oThis.addressesToKindMap);

      if (addresses.length === 0) {
        logger.error('No chain addresses found on auxChainId: ', auxChainId);
        continue;
      }

      logger.step('Fetching balances for chain addresses on auxChainId: ' + auxChainId);
      let addressesToBalanceMap = await oThis._fetchStPrimeBalance(auxChainId, addresses);

      for (let address in addressesToBalanceMap) {
        let balance = addressesToBalanceMap[address],
          addressKind = oThis.addressesToKindMap[address];
        perChainFundingConfig[addressKind].balance = balance;
      }

      logger.step('Fund chain specific addresses with StPrime if needed');
      await oThis._checkEligibilityAndTransferFunds(auxChainId, perChainFundingConfig);
    }
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

    let perChainFundingConfig = basicHelper.deepDup(stPrimeFundingPerChainConfig);

    logger.step('Fetching addresses on auxChainId: ' + auxChainId);
    let chainAddressesRsp = await oThis._fetchAddressesForChain(auxChainId);

    // Populate Address in fund config
    for (let addressKind in perChainFundingConfig) {
      if (!chainAddressesRsp.data[addressKind]) {
        logger.error('** Address not found for addressKind: ', addressKind, ' on aux chain Id: ', auxChainId);
        continue;
      }
      let address = chainAddressesRsp.data[addressKind].address;
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
    const oThis = this;

    // Fetch all addresses associated to auxChainId.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: auxChainId }),
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

    let transferDetails = [];

    for (let addressKind in perChainFundingConfig) {
      let fundingAddressDetails = perChainFundingConfig[addressKind],
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

      let addressMinimumBalance = basicHelper
          .convertToWei(String(fundingAddressDetails.oneGWeiMinOSTPrimeAmount))
          .mul(basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer)),
        addressCurrentBalance = basicHelper.convertToBigNumber(balance),
        addressMinimumBalanceRequiredForGivenFlows = addressMinimumBalance.mul(
          fundingAddressDetails.fundIfLessThanFlows
        );

      logger.log('Address: ', address);
      logger.log('Current balance of address: ', addressCurrentBalance.toString(10));
      logger.log('Minimum required balance of address: ', addressMinimumBalance.toString(10));
      logger.log(
        'Minimum required balance of address for required flows: ',
        addressMinimumBalanceRequiredForGivenFlows.toString(10)
      );

      if (addressCurrentBalance.lt(addressMinimumBalanceRequiredForGivenFlows)) {
        let amountToBeTransferred = addressMinimumBalance.mul(fundingAddressDetails.fundForFlows).toString(10),
          transferParams = {
            from: oThis.masterInternalFunderAddress,
            to: address,
            amountInWei: amountToBeTransferred
          };
        logger.log('Funds transferred are: ', amountToBeTransferred);
        transferDetails.push(transferParams);
      }
    }

    logger.step('Transferring StPrime to addresses on auxChainId: ' + auxChainId);

    // Start transfer.
    oThis.canExit = false;

    if (transferDetails.length > 0) {
      await oThis._transferStPrime(auxChainId, transferDetails);
    }
    oThis.canExit = true;
  }
}

logger.log('Starting cron to fund StPrime to chain addresses by chainOwner.');

new FundByChainOwnerAuxChainSpecificChainAddresses({ cronProcessId: +program.cronProcessId })
  .perform()
  .then(function() {
    process.emit('SIGINT');
  })
  .catch(function() {
    process.emit('SIGINT');
  });
