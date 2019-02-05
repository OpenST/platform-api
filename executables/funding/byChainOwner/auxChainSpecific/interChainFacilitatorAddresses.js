'use strict';
/**
 * Cron to fund eth by chainOwner to chain specific inter chain facilitator addresses
 *
 * @module executables/funding/byChainOwner/auxChainSpecific/interChainFacilitatorAddresses
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
  AuxChainSpecificFundingCronBase = require(rootPrefix + '/executables/funding/byChainOwner/auxChainSpecific/Base');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/funding/byChainOwner/auxChainSpecific/interChainFacilitatorAddresses.js --cronProcessId 16'
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

// Eth funding config per chain
const ethFundingConfig = {
  [chainAddressConstants.interChainFacilitatorKind]: {
    oneGWeiMinAmount: '0.01135',
    fundForFlows: flowsForTransferBalance,
    fundIfLessThanFlows: flowsForMinimumBalance
  }
};

/**
 * Class to fund eth by chainOwner to chain specific inter chain facilitator addresses
 *
 * @class
 */
class FundByChainOwnerAuxChainSpecificInterChainFacilitatorAddresses extends AuxChainSpecificFundingCronBase {
  /**
   * Constructor fund eth by chainOwner to chain specific inter chain facilitator addresses
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
    return cronProcessesConstants.fundByChainOwnerAuxChainSpecificInterChainFacilitatorAddresses;
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
   * Send funds if needed.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _sendFundsIfNeeded() {
    const oThis = this;

    let facilitatorAddresses = [];

    // Loop over all auxChainIds.
    for (let index = 0; index < oThis.auxChainIds.length; index++) {
      let auxChainId = oThis.auxChainIds[index];

      logger.step('** Starting auxChainId: ', auxChainId);

      logger.step('Fetching chain specific addresses and populating funding config');

      let facilitatorAddress = await oThis._fetchFacilitatorAddresses(auxChainId);

      facilitatorAddresses.push(facilitatorAddress);
    }

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
      fundingAddressDetails = ethFundingConfig[[chainAddressConstants.interChainFacilitatorKind]],
      addressMinimumBalance = basicHelper
        .convertToWei(String(fundingAddressDetails.oneGWeiMinAmount))
        .mul(basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer));

    for (let address in addressesToBalanceMap) {
      let addressCurrentBalance = basicHelper.convertToBigNumber(addressesToBalanceMap[address]),
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

    // Start transfer.
    oThis.canExit = false;

    if (transferDetails.length > 0) {
      logger.step('Transferring Eth to facilitator addresses on origin chain id: ', oThis.originChainId);

      await oThis._transferEth(transferDetails);

      oThis.canExit = true;
    } else {
      logger.step('None of the addresses had lower than threshold balance on chainId: ', oThis.originChainId);
    }
    oThis.canExit = true;
  }
}

logger.log('Starting cron to fund StPrime to chain addresses by chainOwner.');

new FundByChainOwnerAuxChainSpecificInterChainFacilitatorAddresses({ cronProcessId: +program.cronProcessId })
  .perform()
  .then(function() {
    process.emit('SIGINT');
  })
  .catch(function() {
    process.emit('SIGINT');
  });
