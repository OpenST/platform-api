'use strict';
/**
 * Cron to fund eth by chainOwner to chain specific inter chain facilitator addresses
 *
 * by: Master internal funder
 * to: Inter chain facilitator addresses
 * what: eth
 *
 * @module executables/funding/byMasterInternalFunder/auxChainSpecific/interChainFacilitatorAddresses
 *
 * This cron expects originChainId and auxChainId as parameter in the params.
 */
const program = require('commander');

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  fundingAmounts = require(rootPrefix + '/config/funding'),
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
    '    node executables/funding/byMasterInternalFunder/auxChainSpecific/interChainFacilitatorAddresses.js --cronProcessId 16'
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
  originMaxGasPriceMultiplierWithBuffer = basicHelper.getOriginMaxGasPriceMultiplierWithBuffer(),
  fundingAmountsOriginGasMap = fundingAmounts[chainAddressConstants.masterInternalFunderKind].originGas;

// Eth funding config per chain
const ethFundingConfig = {
  [chainAddressConstants.interChainFacilitatorKind]: {
    fundAmount: fundingAmountsOriginGasMap[chainAddressConstants.interChainFacilitatorKind].fundAmount,
    thresholdAmount: fundingAmountsOriginGasMap[chainAddressConstants.interChainFacilitatorKind].thresholdAmount
  }
};

/**
 * Class to fund eth by chainOwner to chain specific inter chain facilitator addresses
 *
 * @class
 */
class fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses extends AuxChainSpecificFundingCronBase {
  /**
   * Constructor fund eth by chainOwner to chain specific inter chain facilitator addresses
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
  }

  /**
   * Cron kind
   *
   * @return {String}
   *
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses;
  }

  /**
   * Send funds if needed.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _sendFundsIfNeeded() {
    const oThis = this;

    let facilitatorAddresses = [],
      auxChainId = oThis.auxChainId;

    logger.step('** Starting auxChainId: ', auxChainId);

    logger.step('Fetching chain specific addresses and populating funding config');

    let facilitatorAddress = await oThis._fetchFacilitatorAddresses(auxChainId);

    facilitatorAddresses.push(facilitatorAddress);

    logger.step('Fetching balances for facilitator addresses on origin chain id: ', oThis.originChainId);

    let addressesToBalanceMap = await oThis._fetchEthBalances(facilitatorAddresses);

    await oThis._checkEligibilityAndTransferFunds(addressesToBalanceMap);
  }

  /**
   * Fetch inter chain facilitator address for specific aux chain id.
   *
   * @param {Object} auxChainId
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _fetchFacilitatorAddresses(auxChainId) {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_f_bco_acs_icfa_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return chainAddressesRsp.data[chainAddressConstants.interChainFacilitatorKind].address;
  }

  /**
   * Check if inter chain facilitiator addresses are eligible for funding and transfer them funds.
   *
   * @param {Object} addressesToBalanceMap
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _checkEligibilityAndTransferFunds(addressesToBalanceMap) {
    const oThis = this;

    let transferDetails = [],
      totalAmountToTransferFromMIF = basicHelper.convertToBigNumber(0),
      fundingAddressDetails = ethFundingConfig[[chainAddressConstants.interChainFacilitatorKind]],
      addressMaxFundAmount = basicHelper
        .convertToLowerUnit(String(fundingAddressDetails.fundAmount), coreConstants.ETH_CONVERSION_DECIMALS)
        .mul(basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer));

    for (let address in addressesToBalanceMap) {
      let addressCurrentBalance = basicHelper.convertToBigNumber(addressesToBalanceMap[address]),
        addressThresholdBalance = basicHelper
          .convertToLowerUnit(String(fundingAddressDetails.thresholdAmount), coreConstants.ETH_CONVERSION_DECIMALS)
          .mul(basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer));

      logger.log('Address: ', address);
      logger.log('Current balance of address: ', addressCurrentBalance.toString(10));
      logger.log('Max Amount to Fund to address: ', addressMaxFundAmount.toString(10));
      logger.log('Minimum required balance of address', addressThresholdBalance.toString(10));

      if (addressCurrentBalance.lt(addressThresholdBalance)) {
        let amountToBeTransferredBN = addressMaxFundAmount.minus(addressCurrentBalance),
          transferParams = {
            from: oThis.masterInternalFunderAddress,
            to: address,
            amountInWei: amountToBeTransferredBN.toString(10)
          };
        logger.log('Funds transferred are: ', amountToBeTransferredBN.toString(10));
        transferDetails.push(transferParams);
        totalAmountToTransferFromMIF = totalAmountToTransferFromMIF.plus(amountToBeTransferredBN);
      }
    }

    // Start transfer.
    oThis.canExit = false;

    if (transferDetails.length > 0 && (await oThis._isMIFEthBalanceGreaterThan(totalAmountToTransferFromMIF))) {
      logger.step('Transferring Eth to facilitator addresses on origin chain id: ', oThis.originChainId);

      await oThis._transferEth(transferDetails);
    } else {
      logger.step('None of the addresses had lower than threshold balance on chainId: ', oThis.originChainId);
    }

    oThis.canExit = true;
  }
}

logger.log('Starting cron to fund StPrime to chain addresses by chainOwner.');

new fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses({ cronProcessId: +program.cronProcessId })
  .perform()
  .then(function() {
    process.emit('SIGINT');
  })
  .catch(function() {
    process.emit('SIGINT');
  });
