/**
 * Cron to fund eth by master internal funder.
 *
 * Funding
 * by: Master Internal Funder
 * to: [originDeployerKind, originDefaultBTOrgContractAdminKind, originDefaultBTOrgContractWorkerKind]
 *
 * @module executables/funding/byMasterInternalFunder/originChainSpecific
 *
 * This cron expects originChainId as a parameter in the params.
 */
const program = require('commander');

const rootPrefix = '../../..',
  TransferEth = require(rootPrefix + '/lib/transfer/Eth'),
  CronBase = require(rootPrefix + '/executables/CronBase'),
  GetEthBalance = require(rootPrefix + '/lib/getBalance/Eth'),
  GetErc20Balance = require(rootPrefix + '/lib/getBalance/Erc20'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  StakeCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyBySymbol'),
  AllStakeCurrencySymbolsCache = require(rootPrefix + '/lib/cacheManagement/shared/AllStakeCurrencySymbols'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  fundingAmounts = require(rootPrefix + '/config/funding'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  grantConstants = require(rootPrefix + '/lib/globalConstant/grant'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  environmentInfoConstants = require(rootPrefix + '/lib/globalConstant/environmentInfo');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/funding/byMasterInternalFunder/originChainSpecific.js --cronProcessId 9');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

// Declare variables.
const flowsForGranterMinimumBalance = basicHelper.convertToBigNumber(coreConstants.FLOWS_FOR_GRANTER_ECONOMY_SETUP),
  originMaxGasPriceMultiplierWithBuffer = basicHelper.getOriginMaxGasPriceMultiplierWithBuffer();

const fundingAmountsOriginGasMap = fundingAmounts[chainAddressConstants.masterInternalFunderKind].originGas;

// Config for addresses which need to be funded.
const ethFundingConfig = {
  [chainAddressConstants.originDeployerKind]: {
    fundAmount: fundingAmountsOriginGasMap[chainAddressConstants.originDeployerKind].fundAmount,
    thresholdAmount: fundingAmountsOriginGasMap[chainAddressConstants.originDeployerKind].thresholdAmount
  },
  [chainAddressConstants.originDefaultBTOrgContractAdminKind]: {
    fundAmount: fundingAmountsOriginGasMap[chainAddressConstants.originDefaultBTOrgContractAdminKind].fundAmount,
    thresholdAmount:
      fundingAmountsOriginGasMap[chainAddressConstants.originDefaultBTOrgContractAdminKind].thresholdAmount
  },
  [chainAddressConstants.originDefaultBTOrgContractWorkerKind]: {
    fundAmount: fundingAmountsOriginGasMap[chainAddressConstants.originDefaultBTOrgContractWorkerKind].fundAmount,
    thresholdAmount:
      fundingAmountsOriginGasMap[chainAddressConstants.originDefaultBTOrgContractWorkerKind].thresholdAmount
  },
  [chainAddressConstants.originAnchorOrgContractAdminKind]: {
    fundAmount: fundingAmountsOriginGasMap[chainAddressConstants.originAnchorOrgContractAdminKind].fundAmount,
    thresholdAmount: fundingAmountsOriginGasMap[chainAddressConstants.originAnchorOrgContractAdminKind].thresholdAmount
  }
};

// Alert Config
const alertConfig = {
  [chainAddressConstants.masterInternalFunderKind]: {
    alertRequired: true
  },
  [chainAddressConstants.originGranterKind]: {
    alertRequired: coreConstants.subEnvironment !== environmentInfoConstants.subEnvironment.main
  }
};

/**
 * Class to fund eth by chain owner.
 *
 * @class FundByMasterInternalFunderOriginChainSpecific
 */
class FundByMasterInternalFunderOriginChainSpecific extends CronBase {
  /**
   * Constructor to fund eth by chain owner.
   *
   * @param {object} params
   * @param {number/string} params.cronProcessId
   *
   * @augments CronBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.canExit = true;

    oThis.ethFundingConfig = basicHelper.deepDup(ethFundingConfig);

    oThis.alertConfig = basicHelper.deepDup(alertConfig);

    oThis.allStakeCurrencySymbols = null;
    oThis.stakeCurrencyDetails = {};
  }

  /**
   * Cron kind.
   *
   * @return {string}
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.fundByMasterInternalFunderOriginChainSpecific;
  }

  /**
   * Validate and sanitize.
   *
   * @return {Promise<never>}
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    if (!oThis.originChainId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_f_bmif_ocs_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { originChainId: oThis.originChainId }
        })
      );
    }
  }

  /**
   * Pending tasks done.
   *
   * @return {boolean}
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
   * @private
   */
  async _start() {
    const oThis = this;

    if (coreConstants.SA_ORIGIN_NETWORK_UPGRADE === cronProcessesConstants.networkStatusUpgradeOngoing) {
      logger.step('Cron execution terminated due to Origin Network Update.');
      return;
    }

    await oThis._fetchAllStakeCurrencySymbols();

    await oThis._fetchStakeCurrencyDetails();

    logger.step('Populating alert config');
    oThis.populateAlertConfig();

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
   * fetch all stake currency symbols
   * @private
   */
  async _fetchAllStakeCurrencySymbols() {
    const oThis = this;

    const allStakeCurrencySymbols = await new AllStakeCurrencySymbolsCache().fetch();

    if (allStakeCurrencySymbols.isFailure()) {
      return Promise.reject(allStakeCurrencySymbols);
    }

    oThis.allStakeCurrencySymbols = allStakeCurrencySymbols.data;
  }

  /**
   * This function fetches stake currency details.
   *
   * @sets oThis.stakeCurrencyDetails
   *
   * @private
   */
  async _fetchStakeCurrencyDetails() {
    const oThis = this;

    if (oThis.allStakeCurrencySymbols.length === 0) return;

    const stakeCurrencyCacheResponse = await new StakeCurrencyBySymbolCache({
      stakeCurrencySymbols: oThis.allStakeCurrencySymbols
    }).fetch();

    if (stakeCurrencyCacheResponse.isFailure()) {
      return Promise.reject(stakeCurrencyCacheResponse);
    }

    oThis.stakeCurrencyDetails = stakeCurrencyCacheResponse.data;
  }

  /**
   * This function populates alert config.
   */
  populateAlertConfig() {
    const oThis = this;

    let maxEthBalanceToFund = basicHelper.convertToLowerUnit(String(0), coreConstants.ETH_DECIMALS),
      thresholdEthBalance = basicHelper.convertToLowerUnit(String(0), coreConstants.ETH_DECIMALS);

    const mifEthFundingConfig = basicHelper.deepDup(
      fundingAmounts[chainAddressConstants.masterInternalFunderKind].originGas
    );

    for (const address in mifEthFundingConfig) {
      maxEthBalanceToFund = maxEthBalanceToFund.plus(
        basicHelper.convertToLowerUnit(String(mifEthFundingConfig[address].fundAmount), coreConstants.ETH_DECIMALS)
      );
      thresholdEthBalance = thresholdEthBalance.plus(
        basicHelper.convertToLowerUnit(String(mifEthFundingConfig[address].thresholdAmount), coreConstants.ETH_DECIMALS)
      );
    }

    oThis.alertConfig[chainAddressConstants.masterInternalFunderKind].minEthRequirement = maxEthBalanceToFund
      .mul(basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer))
      .mul(basicHelper.convertToBigNumber(0.4));

    const granterEthRequirement = basicHelper.convertToBigNumber(grantConstants.grantEthValueInWei);

    oThis.alertConfig[chainAddressConstants.originGranterKind].minEthRequirement = granterEthRequirement.mul(
      flowsForGranterMinimumBalance
    );

    let buffer = oThis.alertConfig[chainAddressConstants.originGranterKind];
    buffer.stakeCurrencies = {};

    for (let i = 0; i < oThis.allStakeCurrencySymbols.length; i++) {
      let stakeCurrencySymbol = oThis.allStakeCurrencySymbols[i],
        granterRequirement = basicHelper.convertToBigNumber(
          oThis.stakeCurrencyDetails[stakeCurrencySymbol]['constants']['grantAmountInWei']
        );
      buffer.stakeCurrencies[stakeCurrencySymbol] = {
        minRequirement: granterRequirement.mul(flowsForGranterMinimumBalance)
      };
    }
  }

  /**
   * Fetch addresses which need to be funded.
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchAddresses() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_f_bmif_ocs_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.masterInternalFunderAddress = chainAddressesRsp.data[chainAddressConstants.masterInternalFunderKind].address;

    oThis.AdddressesToKindMap = {};

    // Populate Address in fund config
    for (const addressKind in oThis.ethFundingConfig) {
      oThis.ethFundingConfig[addressKind].address = chainAddressesRsp.data[addressKind].address;
      oThis.AdddressesToKindMap[oThis.ethFundingConfig[addressKind].address] = addressKind;
    }

    // Populate Address in alert config
    for (const addressKind in oThis.alertConfig) {
      // On production main, granter address is not present. Following is fix for the same.
      if (!chainAddressesRsp.data[addressKind]) {
        logger.log('skipping addressKind', addressKind);
        continue;
      }
      oThis.alertConfig[addressKind].address = chainAddressesRsp.data[addressKind].address;
      oThis.AdddressesToKindMap[oThis.alertConfig[addressKind].address] = addressKind;
    }
  }

  /**
   * Fetch balances for all the addresses.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchBalances() {
    const oThis = this;

    // Fetch eth balances
    const getEthBalance = new GetEthBalance({
      originChainId: oThis.originChainId,
      addresses: Object.keys(oThis.AdddressesToKindMap)
    });

    const addressesToBalanceMap = await getEthBalance.perform();

    // Populate balance in funding config and alert config
    for (const address in addressesToBalanceMap) {
      const balance = addressesToBalanceMap[address],
        addressKind = oThis.AdddressesToKindMap[address];

      if (oThis.ethFundingConfig[addressKind]) {
        oThis.ethFundingConfig[addressKind].balance = balance;
      }
      if (oThis.alertConfig[addressKind]) {
        oThis.alertConfig[addressKind].balance = balance;
      }
    }
  }

  /**
   * Check which addresses are eligible to get funds and prepare params for transfer.
   *
   * @return {Promise<void>}
   * @private
   */
  async _sendFundsIfNeeded() {
    const oThis = this;

    const transferDetails = [];
    let totalAmountToTransferFromMIF = basicHelper.convertToBigNumber(0);

    for (const addressKind in oThis.ethFundingConfig) {
      const fundingAddressDetails = oThis.ethFundingConfig[addressKind],
        address = fundingAddressDetails.address,
        addressThresholdBalance = basicHelper
          .convertToLowerUnit(String(fundingAddressDetails.thresholdAmount), coreConstants.ETH_DECIMALS)
          .mul(basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer)),
        addressCurrentBalance = basicHelper.convertToBigNumber(fundingAddressDetails.balance),
        addressMaxAmountToFund = basicHelper
          .convertToLowerUnit(String(fundingAddressDetails.fundAmount), coreConstants.ETH_DECIMALS)
          .mul(basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer));

      if (addressCurrentBalance.lt(addressThresholdBalance)) {
        const amountToTransferBN = addressMaxAmountToFund.minus(addressCurrentBalance),
          params = {
            from: oThis.masterInternalFunderAddress,
            to: address,
            amountInWei: amountToTransferBN.toString(10)
          };
        totalAmountToTransferFromMIF = totalAmountToTransferFromMIF.plus(amountToTransferBN);
        transferDetails.push(params);
      }
    }

    logger.step('Transferring amount.');
    logger.debug('Transfer Amount Details Map:', transferDetails);
    if (transferDetails.length > 0 && (await oThis._isMIFBalanceGreaterThan(totalAmountToTransferFromMIF))) {
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
   * This function tells if the master internal funder balance is greater than the given amount.
   *
   * @param {string/number} amount
   *
   * @returns {Promise<boolean>}
   * @private
   */
  async _isMIFBalanceGreaterThan(amount) {
    const oThis = this;

    // Fetch eth balances
    const getMIFBalance = new GetEthBalance({
      originChainId: oThis.originChainId,
      addresses: [oThis.masterInternalFunderAddress]
    });

    const mifAddressToBalanceMap = await getMIFBalance.perform(),
      mifBalance = basicHelper.convertToBigNumber(mifAddressToBalanceMap[oThis.masterInternalFunderAddress]);

    if (mifBalance.lt(amount)) {
      // Create an alert
      logger.warn(
        'addressKind ' + oThis.masterInternalFunderAddress + ' has low balance on chainId: ' + oThis.originChainId
      );

      const errorObject = responseHelper.error({
        internal_error_identifier: 'low_eth_balance_master_internal_funder:e_f_bmif_ocs_3',
        api_error_identifier: 'low_eth_balance_master_internal_funder',
        debug_options: { address: oThis.masterInternalFunderAddress, chainId: oThis.originChainId }
      });

      await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);

      return false;
    }

    return true;
  }

  /**
   * Send alerts if needed.
   *
   * @private
   */
  async _sendAlertIfNeeded() {
    const oThis = this;

    for (const addressKind in oThis.alertConfig) {
      const alertConfigDetails = oThis.alertConfig[addressKind],
        address = alertConfigDetails.address;

      // On production main, granter address is not present. Following is fix for the same.
      if (!address) {
        logger.info('skipping for address kind', addressKind);
        continue;
      }

      if (alertConfigDetails.minEthRequirement) {
        const addressEthRequirement = alertConfigDetails.minEthRequirement,
          addressCurrentBalance = basicHelper.convertToBigNumber(alertConfigDetails.balance),
          currency = 'Eth';

        if (addressCurrentBalance.lt(addressEthRequirement) && alertConfigDetails.alertRequired) {
          await oThis._notify(addressKind, address, currency, addressEthRequirement);
        }
      }

      if (alertConfigDetails.stakeCurrencies) {
        for (let stakeCurrencySymbol in alertConfigDetails.stakeCurrencies) {
          const addressBalanceRequirement = alertConfigDetails.stakeCurrencies[stakeCurrencySymbol]['minRequirement'],
            addressCurrentBalance = await oThis._fetchErc20Balance(stakeCurrencySymbol, address),
            addressCurrentBalanceBN = basicHelper.convertToBigNumber(addressCurrentBalance);

          if (addressCurrentBalanceBN.lt(addressBalanceRequirement) && alertConfigDetails.alertRequired) {
            await oThis._notify(addressKind, address, stakeCurrencySymbol, addressBalanceRequirement);
          }
        }
      }
    }
  }

  /**
   * Fetches Erc20 token balance of a given address.
   *
   * @param {string} symbol
   * @param {string} address
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchErc20Balance(symbol, address) {
    const oThis = this,
      stakeCurrencyDetail = oThis.stakeCurrencyDetails[symbol];

    const getOstBalanceObj = new GetErc20Balance({
        originChainId: oThis.originChainId,
        addresses: [address],
        contractAddress: stakeCurrencyDetail['contractAddress']
      }),
      getOstBalanceMap = await getOstBalanceObj.perform();

    return getOstBalanceMap[address];
  }

  /**
   * This function performs notification of an error condition.
   *
   * @param {String} addressKind
   * @param {String} address
   * @param {String} currency
   * @param {String} addressRequirement
   *
   * @private
   */
  async _notify(addressKind, address, currency, addressRequirement) {
    const oThis = this;

    logger.warn('addressKind ' + addressKind + ' has low balance on chainId: ' + oThis.originChainId);
    const errorObject = responseHelper.error({
      internal_error_identifier: 'low_balance:e_f_bmif_ocs_6',
      api_error_identifier: 'low_balance',
      debug_options: {
        currency: currency,
        addressKind: addressKind,
        address: address,
        chainId: oThis.originChainId,
        addressRequirement: addressRequirement
      }
    });

    await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);
  }
}

logger.log('Starting cron to fund eth by master internal funder.');

new FundByMasterInternalFunderOriginChainSpecific({ cronProcessId: +program.cronProcessId })
  .perform()
  .then(function() {
    process.emit('SIGINT');
  })
  .catch(function() {
    process.emit('SIGINT');
  });
