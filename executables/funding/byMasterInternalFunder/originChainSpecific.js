'use strict';
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
  basicHelper = require(rootPrefix + '/helpers/basic'),
  TransferEth = require(rootPrefix + '/lib/transfer/Eth'),
  CronBase = require(rootPrefix + '/executables/CronBase'),
  GetEthBalance = require(rootPrefix + '/lib/getBalance/Eth'),
  GetOstBalance = require(rootPrefix + '/lib/getBalance/Ost'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  grantConstants = require(rootPrefix + '/lib/globalConstant/grant'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  fundingAmounts = require(rootPrefix + '/config/funding'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  environmentInfoConstants = require(rootPrefix + '/lib/globalConstant/environmentInfo'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

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
const flowsForMinimumBalance = basicHelper.convertToBigNumber(coreConstants.FLOWS_FOR_MINIMUM_BALANCE),
  flowsForTransferBalance = basicHelper.convertToBigNumber(coreConstants.FLOWS_FOR_TRANSFER_BALANCE),
  flowsForGranterMinimumBalance = basicHelper.convertToBigNumber(coreConstants.FLOWS_FOR_GRANTER_ECONOMY_SETUP),
  flowsForMasterInternalFunderMinimumBalance = basicHelper.convertToBigNumber(
    coreConstants.FLOWS_FOR_CHAIN_OWNER_ECONOMY_SETUP
  ),
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
 * @class
 */
class FundByMasterInternalFunderOriginChainSpecific extends CronBase {
  /**
   * Constructor to fund eth by chain owner.
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.canExit = true;

    oThis.ethFundingConfig = basicHelper.deepDup(ethFundingConfig);

    oThis.alertConfig = basicHelper.deepDup(alertConfig);
  }

  /**
   * Cron kind
   *
   * @return {String}
   *
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.fundByMasterInternalFunderOriginChainSpecific;
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
   * This function populates alert config
   *
   * @returns {Object}
   */
  populateAlertConfig() {
    const oThis = this;

    let maxEthBalanceToFund = basicHelper.convertToWei(String(0)),
      thresholdEthBalance = basicHelper.convertToWei(String(0)),
      mifEthFundingConfig = basicHelper.deepDup(
        fundingAmounts[chainAddressConstants.masterInternalFunderKind].originGas
      );

    for (let address in mifEthFundingConfig) {
      maxEthBalanceToFund = maxEthBalanceToFund.plus(
        basicHelper.convertToWei(String(mifEthFundingConfig[address].fundAmount))
      );
      thresholdEthBalance = thresholdEthBalance.plus(
        basicHelper.convertToWei(String(mifEthFundingConfig[address].thresholdAmount))
      );
    }

    oThis.alertConfig[chainAddressConstants.masterInternalFunderKind].minEthRequirement = maxEthBalanceToFund.mul(
      basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer)
    );

    let granterEthRequirement = basicHelper.convertToBigNumber(grantConstants.grantEthValueInWei),
      granterOstRequirement = basicHelper.convertToBigNumber(grantConstants.grantOstValueInWei);

    oThis.alertConfig[chainAddressConstants.originGranterKind].minEthRequirement = granterEthRequirement.mul(
      flowsForGranterMinimumBalance
    );
    oThis.alertConfig[chainAddressConstants.originGranterKind].minOstRequirement = granterOstRequirement.mul(
      flowsForGranterMinimumBalance
    );
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
    for (let addressKind in oThis.ethFundingConfig) {
      oThis.ethFundingConfig[addressKind].address = chainAddressesRsp.data[addressKind].address;
      oThis.AdddressesToKindMap[oThis.ethFundingConfig[addressKind].address] = addressKind;
    }

    // Populate Address in alert config
    for (let addressKind in oThis.alertConfig) {
      oThis.alertConfig[addressKind].address = chainAddressesRsp.data[addressKind].address;
      oThis.AdddressesToKindMap[oThis.alertConfig[addressKind].address] = addressKind;
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
   * @private
   */
  async _sendFundsIfNeeded() {
    const oThis = this;

    let transferDetails = [],
      totalAmountToTransferFromMIF = basicHelper.convertToBigNumber(0);

    for (let addressKind in oThis.ethFundingConfig) {
      let fundingAddressDetails = oThis.ethFundingConfig[addressKind],
        address = fundingAddressDetails.address,
        addressThresholdBalance = basicHelper
          .convertToWei(String(fundingAddressDetails.thresholdAmount))
          .mul(basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer)),
        addressCurrentBalance = basicHelper.convertToBigNumber(fundingAddressDetails.balance),
        addressMaxAmountToFund = basicHelper
          .convertToWei(String(fundingAddressDetails.fundAmount))
          .mul(basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer));

      if (addressCurrentBalance.lt(addressThresholdBalance)) {
        let amountToTransferBN = addressMaxAmountToFund.minus(addressCurrentBalance),
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
   * @param amount
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

    let mifAddressToBalanceMap = await getMIFBalance.perform(),
      mifBalance = basicHelper.convertToBigNumber(mifAddressToBalanceMap[oThis.masterInternalFunderAddress]);

    if (mifBalance.lt(amount)) {
      //Create an alert
      logger.warn(
        'addressKind ' + oThis.masterInternalFunderAddress + ' has low balance on chainId: ' + oThis.originChainId
      );
      logger.notify(
        'e_f_bco_ocs_3',
        'Low balance of addressKind: ' + chainAddressConstants.masterInternalFunderKind + '. on chainId: ',
        +oThis.originChainId + ' Address: ' + oThis.masterInternalFunderAddress
      );

      return false;
    }

    return true;
  }

  /**
   * Send alerts if needed
   *
   * @private
   */
  async _sendAlertIfNeeded() {
    const oThis = this;

    for (let addressKind in oThis.alertConfig) {
      let alertConfigDetails = oThis.alertConfig[addressKind],
        address = alertConfigDetails.address;

      if (alertConfigDetails.minEthRequirement) {
        let addressEthRequirement = alertConfigDetails.minEthRequirement,
          addressCurrentBalance = basicHelper.convertToBigNumber(alertConfigDetails.balance),
          currency = 'Eth';

        if (addressCurrentBalance.lt(addressEthRequirement) && alertConfigDetails.alertRequired) {
          oThis._notify(addressKind, address, currency);
        }
      }

      if (alertConfigDetails.minOstRequirement) {
        let addressOstRequirement = alertConfigDetails.minOstRequirement,
          addressCurrentOstBalance = await oThis._fetchOstBalance(address), //Ost Balance
          addressCurrentOstBalanceBN = basicHelper.convertToBigNumber(addressCurrentOstBalance),
          currency = 'OST';

        if (addressCurrentOstBalanceBN.lt(addressOstRequirement) && alertConfigDetails.alertRequired) {
          oThis._notify(addressKind, address, currency);
        }
      }
    }
  }

  /**
   * Fetches OST balance of a given address
   *
   * @param address
   * @returns {Promise<*>}
   * @private
   */
  async _fetchOstBalance(address) {
    const oThis = this;

    let getOstBalanceObj = new GetOstBalance({ originChainId: oThis.originChainId, addresses: [address] }),
      getOstBalanceMap = await getOstBalanceObj.perform();

    return getOstBalanceMap[address];
  }

  /**
   * This function performs notification of an error condition
   *
   * @param addressKind
   * @param address
   * @param currency
   * @private
   */
  _notify(addressKind, address, currency) {
    const oThis = this;

    logger.warn('addressKind ' + addressKind + ' has low balance on chainId: ' + oThis.originChainId);
    logger.notify(
      'e_f_bco_ocs_4',
      'Low balance of ' + currency + '. ' + 'addressKind: ' + addressKind + '. on chainId: ',
      +oThis.originChainId + ' Address: ' + address
    );
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
