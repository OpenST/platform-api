'use strict';
/**
 * Cron to fund eth by chainOwner.
 *
 * @module executables/funding/byChainOwner/originChainSpecific
 *
 * This cron expects originChainId as a parameter in the params.
 */
const program = require('commander');

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  TransferEth = require(rootPrefix + '/lib/transfer/Eth'),
  CronBase = require(rootPrefix + '/executables/CronBase'),
  GetEthBalance = require(rootPrefix + '/lib/getBalance/Eth'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  environmentInfoConstants = require(rootPrefix + '/lib/globalConstant/environmentInfo'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/funding/byChainOwner/originChainSpecific --cronProcessId 9');
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
  flowsForGranterMinimumBalance = basicHelper.convertToBigNumber(coreConstants.FLOWS_FOR_GRANTER_ECONOMY_SETUP),
  flowsForChainOwnerMinimumBalance = basicHelper.convertToBigNumber(coreConstants.FLOWS_FOR_CHAIN_OWNER_ECONOMY_SETUP),
  originMaxGasPriceMultiplierWithBuffer = basicHelper.getOriginMaxGasPriceMultiplierWithBuffer();

// Config for addresses which need to be funded.
const fundingConfig = {
  [chainAddressConstants.originDeployerKind]: {
    oneGWeiMinAmount: '0.00955',
    fundForFlows: flowsForTransferBalance,
    fundIfLessThanFlows: flowsForMinimumBalance
  },
  [chainAddressConstants.originDefaultBTOrgContractAdminKind]: {
    oneGWeiMinAmount: '0.00010',
    fundForFlows: flowsForTransferBalance,
    fundIfLessThanFlows: flowsForMinimumBalance
  },
  [chainAddressConstants.originDefaultBTOrgContractWorkerKind]: {
    oneGWeiMinAmount: '0.00007',
    fundForFlows: flowsForTransferBalance,
    fundIfLessThanFlows: flowsForMinimumBalance
  }
};

// Alert Config
const alertConfig = {
  [chainAddressConstants.masterInternalFunderKind]: {
    minAmount: '0.6',
    alertIfLessThanFlows: flowsForChainOwnerMinimumBalance,
    alertRequired: true
  },
  [chainAddressConstants.originGranterKind]: {
    minAmount: '1',
    alertIfLessThanFlows: flowsForGranterMinimumBalance,
    alertRequired: coreConstants.subEnvironment !== environmentInfoConstants.subEnvironment.main
  }
};

/**
 * Class to fund eth by chain owner.
 *
 * @class
 */
class FundByChainOwnerOriginChainSpecific extends CronBase {
  /**
   * Constructor to fund eth by chain owner.
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
    return cronProcessesConstants.fundByChainOwnerOriginChainSpecific;
  }

  /**
   * Validate and sanitize
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    if (!oThis.originChainId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_f_bco_ocs_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { originChainId: oThis.originChainId }
        })
      );
    }
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
   * Start the cron.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _start() {
    const oThis = this;

    logger.step('Fetching addresses which need to be funded.');
    await oThis._fetchAddresses();

    logger.step('Fetching balances of addresses.');
    await oThis._fetchBalances();

    logger.step('Checking if addresses are eligible for transfer.');
    await oThis._sendFundsIfNeeded();

    logger.step('Sending alert emails if needed.');
    await oThis._sendAlertIfNeeded();

    logger.step('Cron completed.');
  }

  /**
   * Fetch addresses which need to be funded.
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _fetchAddresses() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_f_bco_ocs_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.masterInternalFunderAddress = chainAddressesRsp.data[chainAddressConstants.masterInternalFunderKind].address;

    oThis.AdddressesToKindMap = {};

    // Populate Address in fund config
    for (let addressKind in fundingConfig) {
      fundingConfig[addressKind].address = chainAddressesRsp.data[addressKind].address;
      oThis.AdddressesToKindMap[fundingConfig[addressKind].address] = addressKind;
    }

    // Populate Address in alert config
    for (let addressKind in alertConfig) {
      alertConfig[addressKind].address = chainAddressesRsp.data[addressKind].address;
      oThis.AdddressesToKindMap[alertConfig[addressKind].address] = addressKind;
    }
  }

  /**
   * Fetch balances for all the addresses.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchBalances() {
    const oThis = this;

    // Fetch eth balances
    const getEthBalance = new GetEthBalance({
      originChainId: oThis.originChainId,
      addresses: Object.keys(oThis.AdddressesToKindMap)
    });

    let addressesToBalanceMap = await getEthBalance.perform();

    // Populate balance in funding config and alert config
    for (let address in addressesToBalanceMap) {
      let balance = addressesToBalanceMap[address],
        addressKind = oThis.AdddressesToKindMap[address];

      if (fundingConfig[addressKind]) {
        fundingConfig[addressKind].balance = balance;
      }
      if (alertConfig[addressKind]) {
        alertConfig[addressKind].balance = balance;
      }
    }
  }

  /**
   * Check which addresses are eligible to get funds and prepare params for transfer.
   *
   * @private
   */
  async _sendFundsIfNeeded() {
    const oThis = this;

    let transferDetails = [];

    for (let addressKind in fundingConfig) {
      let fundingAddressDetails = fundingConfig[addressKind],
        address = fundingAddressDetails.address,
        addressMinimumBalance = basicHelper
          .convertToWei(String(fundingAddressDetails.oneGWeiMinAmount))
          .mul(basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer)),
        addressCurrentBalance = basicHelper.convertToBigNumber(fundingAddressDetails.balance);

      if (addressCurrentBalance.lt(addressMinimumBalance.mul(fundingAddressDetails.fundIfLessThanFlows))) {
        let params = {
          from: oThis.masterInternalFunderAddress,
          to: address,
          amountInWei: addressMinimumBalance.mul(fundingAddressDetails.fundForFlows).toString(10)
        };
        transferDetails.push(params);
      }
    }

    logger.step('Transferring amount.');
    if (transferDetails.length > 0) {
      oThis.canExit = false;

      const transferEth = new TransferEth({
        originChainId: oThis.originChainId,
        transferDetails: transferDetails
      });

      await transferEth.perform();
      oThis.canExit = true;
    }
  }

  /**
   * Send alerts if needed
   *
   * @private
   */
  async _sendAlertIfNeeded() {
    const oThis = this;

    for (let addressKind in alertConfig) {
      let alertConfigDetails = alertConfig[addressKind],
        address = alertConfigDetails.address,
        addressMinimumBalance = basicHelper
          .convertToWei(String(alertConfigDetails.minAmount))
          .mul(basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer)),
        addressCurrentBalance = basicHelper.convertToBigNumber(alertConfigDetails.balance);

      if (
        addressCurrentBalance.lt(addressMinimumBalance.mul(alertConfigDetails.alertIfLessThanFlows)) &&
        alertConfigDetails.alertRequired
      ) {
        logger.warn('addressKind ' + addressKind + ' has low balance on chainId: ' + oThis.originChainId);
        logger.notify(
          'e_f_bco_ocs_4',
          'Low balance of addressKind: ' + addressKind + '. on chainId: ',
          +oThis.originChainId + ' Address: ' + address
        );
      }
    }
  }
}

logger.log('Starting cron to fund eth by chainOwner.');

new FundByChainOwnerOriginChainSpecific({ cronProcessId: +program.cronProcessId })
  .perform()
  .then(function() {
    process.emit('SIGINT');
  })
  .catch(function() {
    process.emit('SIGINT');
  });
